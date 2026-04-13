type Node = {
    id: string,
    type: string;
    positionX?: number;
    positionY?: number;
    pipelineId?: string;
}

type Edge = {
    id: string;
    pipelineId?: string;
    fromNodeId: string;
    toNodeId: string;
}

type NodeType = {
    name: string;
    inputDataType: string;
    outputDataType: string;
    allowedCycleTarget?: string | null;
}

type ValidationResult = {
    valid: boolean;
    errors: string[];
    errorNodes: Node[];
    errorEdges: Edge[];
}

export class ValidationEngine {
    // Every node has specific inputs and outputs
    validateDataType(nodes: Node[], edges: Edge[], nodeTypes?: NodeType[] | Record<string, NodeType>): ValidationResult {
        const errors: string[] = [];
        const errorNodes: Node[] = [];
        const errorEdges: Edge[] = [];
        const nodeMap = this.buildNodeMap(nodes);
        const typeMap = this.buildNodeTypeMap(nodeTypes);

        for (const e of edges) {
            const from = nodeMap.get(e.fromNodeId);
            const to = nodeMap.get(e.toNodeId);
            if (!from) {
                errors.push(`Edge ${e.id ?? ''} references missing from-node ${e.fromNodeId}`);
                errorEdges.push(e);
                continue;
            }
            if (!to) {
                errors.push(`Edge ${e.id ?? ''} references missing to-node ${e.toNodeId}`);
                errorEdges.push(e);
                continue;
            }

            const fromType = typeMap.get(from.type);
            const toType = typeMap.get(to.type);

            const fromOutput = fromType?.outputDataType ?? 'UNKNOWN';
            const toInput = toType?.inputDataType ?? 'UNKNOWN';
            if (fromOutput === 'UNKNOWN' || toInput === 'UNKNOWN') {
                errors.push(`Cannot determine data types for edge from ${from.id} (${from.type}) to ${to.id} (${to.type}).`);
                errorEdges.push(e);
                continue;
            }

            const fromOutputs = fromOutput.split('/').map(s => s.trim());
            const toInputs = toInput.split('/').map(s => s.trim());

            // If any of the from outputs matches any of the to inputs, it's valid
            const match = fromOutputs.some(fo => toInputs.includes(fo));
            if (!match) {
                errors.push(`Type mismatch on edge from ${from.id} (${from.type} -> ${fromOutput}) to ${to.id} (${to.type} expects ${toInput}).`);
                errorEdges.push(e);
            }
        }

        return { valid: errors.length === 0, errors, errorNodes, errorEdges };
    }

    // Merger Node must have two incoming connections
    // Two incoming connections cannot originate from the same parent node
    validateMerger(nodes: Node[], edges: Edge[], nodeTypes?: NodeType[] | Record<string, NodeType>): ValidationResult {
        const errors: string[] = [];
        const errorNodes: Node[] = [];
        const errorEdges: Edge[] = [];
        const typeMap = this.buildNodeTypeMap(nodeTypes);

        const isMerger = (node: Node) => {
            const nt = typeMap.get(node.type);
            if (nt?.name === 'document_merger') return true;
            return false;
        };

        for (const n of nodes) {
            const incoming = edges.filter(e => e.toNodeId === n.id);
            if (!isMerger(n)) {
                continue
            }
            if (incoming.length !== 2) {
                errors.push(`Document Merger node ${n.id} must have exactly two incoming connections, found ${incoming.length}.`);
                errorNodes.push(n);
                continue;
            }

            if (incoming[0].fromNodeId === incoming[1].fromNodeId) {
                errors.push(`Document Merger node ${n.id} has two incoming connections from the same parent ${incoming[0].fromNodeId}.`);
                errorNodes.push(n);
            }
        }

        return { valid: errors.length === 0, errors, errorNodes, errorEdges };
    }

    // No infinite loops
    // Human Review node can loop back to Text Correction node
    validateCycle(nodes: Node[], edges: Edge[], nodeTypes?: NodeType[] | Record<string, NodeType>): ValidationResult {
        const errors: string[] = [];
        const errorNodes: Node[] = [];
        const errorEdges: Edge[] = [];
        const nodeMap = this.buildNodeMap(nodes);
        const typeMap = this.buildNodeTypeMap(nodeTypes);

        const adj = new Map<string, string[]>();
        for (const n of nodes) adj.set(n.id, []);
        for (const e of edges) {
            if (!adj.has(e.fromNodeId)) adj.set(e.fromNodeId, []);
            adj.get(e.fromNodeId)!.push(e.toNodeId);
        }

        const indegree = new Map<string, number>();
        for (const n of nodes) indegree.set(n.id, 0);
        for (const e of edges) indegree.set(e.toNodeId, (indegree.get(e.toNodeId) ?? 0) + 1);
        const sources = new Set<string>();
        for (const [id, v] of indegree.entries()) if (v === 0) sources.add(id);

        const visited = new Set<string>();
        const onStack = new Set<string>();
        const stack: string[] = [];
        const cycles: { cycle: string[]; backEdgeFrom: string; backEdgeTo: string }[] = [];

        const dfs = (u: string) => {
            visited.add(u);
            onStack.add(u);
            stack.push(u);
            const neighbors = adj.get(u) ?? [];
            for (const v of neighbors) {
                if (!visited.has(v)) {
                    dfs(v);
                } else if (onStack.has(v)) {
                    const idx = stack.lastIndexOf(v);
                    const cyc = stack.slice(idx);
                    cycles.push({ cycle: [...cyc, v], backEdgeFrom: u, backEdgeTo: v });
                }
            }
            stack.pop();
            onStack.delete(u);
        };

        for (const n of nodes) if (!visited.has(n.id)) dfs(n.id);

        // Track which nodes/edges we've already recorded to avoid duplicates
        const addedNodeIds = new Set<string>();
        const addedEdgeKeys = new Set<string>();

        for (const c of cycles) {
            const cycleNodeIds = Array.from(new Set(c.cycle));
            const includesSource = c.cycle.some(id => sources.has(id));

            if (includesSource) {
                errors.push(`Invalid cycle detected involving nodes [${c.cycle.join(', ')}] — cycles cannot include pipeline start nodes.`);
            }

            const origin = nodeMap.get(c.backEdgeFrom)!;
            const target = nodeMap.get(c.backEdgeTo)!;
            const originType = typeMap.get(origin.type);
            const targetType = typeMap.get(target.type);

            const originName = originType?.name ?? origin.type;
            const targetName = targetType?.name ?? target.type;
            const allowedTarget = originType?.allowedCycleTarget ?? undefined;

            // const originIsHuman = /HUMAN(_|\s)?REVIEW/i.test(originName) || (/HUMAN/i.test(originName) && /REVIEW/i.test(originName));
            // const targetIsTextCorrection = /TEXT(_|\s)?CORRECTION/i.test(targetName) || (/CORRECT/i.test(targetName) && /TEXT/i.test(targetName));
            const originIsHuman = originName === 'human_review';
            const targetIsTextCorrection = targetName === 'text_correction';

            const allowed = (allowedTarget ? allowedTarget === targetName : (originIsHuman && targetIsTextCorrection));

            if (!allowed || includesSource) {
                if (!allowed) {
                    errors.push(`Invalid cycle closed by edge ${c.backEdgeFrom} -> ${c.backEdgeTo}. Only a Human Review node may create a cycle and it may only loop back to a Text Correction node.`);
                }

                // Add all nodes in the cycle to errorNodes (avoid duplicates)
                for (const id of cycleNodeIds) {
                    const node = nodeMap.get(id);
                    if (node && !addedNodeIds.has(id)) {
                        errorNodes.push(node);
                        addedNodeIds.add(id);
                    }
                }

                // Add all edges that form the cycle to errorEdges (avoid duplicates)
                // c.cycle typically has the start node repeated at the end, so iterate pairs
                for (let i = 0; i < c.cycle.length - 1; i++) {
                    const fromId = c.cycle[i];
                    const toId = c.cycle[i + 1];
                    const edge = edges.find(e => e.fromNodeId === fromId && e.toNodeId === toId);
                    if (edge) {
                        const key = edge.id ?? `${edge.fromNodeId}->${edge.toNodeId}`;
                        if (!addedEdgeKeys.has(key)) {
                            errorEdges.push(edge);
                            addedEdgeKeys.add(key);
                        }
                    }
                }
            }
        }

        return { valid: errors.length === 0, errors, errorNodes, errorEdges };
    }

    validatePipeline(nodes: Node[], edges: Edge[], nodeTypes?: NodeType[] | Record<string, NodeType>): ValidationResult {
        const errors: string[] = [];
        const errorNodes: Node[] = [];
        const errorEdges: Edge[] = [];
        const d = this.validateDataType(nodes, edges, nodeTypes);
        const m = this.validateMerger(nodes, edges, nodeTypes);
        const c = this.validateCycle(nodes, edges, nodeTypes);
        errors.push(...d.errors, ...m.errors, ...c.errors);
        errorNodes.push(...d.errorNodes, ...m.errorNodes, ...c.errorNodes);
        errorEdges.push(...d.errorEdges, ...m.errorEdges, ...c.errorEdges);
        return { valid: errors.length === 0, errors, errorNodes, errorEdges };
    }

    private buildNodeMap(nodes: Node[]) {
        const map = new Map<string, Node>();
        for (const n of nodes) map.set(n.id, n);
        return map;
    }

    private buildNodeTypeMap(nodeTypes?: NodeType[] | Record<string, NodeType>) {
        const map = new Map<string, NodeType>();
        if (!nodeTypes) return map;
        if (Array.isArray(nodeTypes)) {
            for (const nt of nodeTypes) map.set(nt.name, nt);
        } else {
            for (const k of Object.keys(nodeTypes)) {
                const nt = (nodeTypes as Record<string, NodeType>)[k];
                if (nt?.name) map.set(nt.name, nt);
            }
        }
        return map;
    }
}

export default new ValidationEngine();