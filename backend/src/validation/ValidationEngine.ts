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

        // Build adjacency list
        const adj = new Map<string, string[]>();
        for (const n of nodes) adj.set(n.id, []);
        for (const e of edges) adj.get(e.fromNodeId)!.push(e.toNodeId);

        // Find sources (nodes with no incoming edges)
        const indegree = new Map<string, number>();
        for (const n of nodes) indegree.set(n.id, 0);
        for (const e of edges) indegree.set(e.toNodeId, (indegree.get(e.toNodeId) ?? 0) + 1);
        const sources = new Set([...indegree.entries()].filter(([_, v]) => v === 0).map(([id]) => id));

        // Detect cycles using DFS
        const visited = new Set<string>();
        const onStack = new Set<string>();
        const stack: string[] = [];
        const cycles: { cycle: string[]; backEdgeFrom: string; backEdgeTo: string }[] = [];

        const dfs = (u: string) => {
            visited.add(u);
            onStack.add(u);
            stack.push(u);

            for (const v of adj.get(u) ?? []) {
                if (!visited.has(v)) {
                    dfs(v);
                } else if (onStack.has(v)) {
                    const cycleStart = stack.lastIndexOf(v);
                    cycles.push({
                        cycle: stack.slice(cycleStart),
                        backEdgeFrom: u,
                        backEdgeTo: v
                    });
                }
            }

            stack.pop();
            onStack.delete(u);
        };

        for (const n of nodes) if (!visited.has(n.id)) dfs(n.id);

        // Validate cycles
        const addedNodes = new Set<string>();
        const addedEdges = new Set<string>();

        for (const cycle of cycles) {
            const hasSource = cycle.cycle.some(id => sources.has(id));
            const originNode = nodeMap.get(cycle.backEdgeFrom)!;
            const targetNode = nodeMap.get(cycle.backEdgeTo)!;
            const originType = typeMap.get(originNode.type);

            const isAllowed = !hasSource && this.isAllowedCycle(originType, targetNode.type);

            if (!isAllowed) {
                if (hasSource) {
                    errors.push(`Invalid cycle detected involving nodes [${cycle.cycle.join(', ')}] — cycles cannot include pipeline start nodes.`);
                } else {
                    errors.push(`Invalid cycle closed by edge ${cycle.backEdgeFrom} -> ${cycle.backEdgeTo}. Only a Human Review node may create a cycle and it may only loop back to a Text Correction node.`);
                }

                this.addCycleToResults(cycle, nodeMap, edges, addedNodes, addedEdges, errorNodes, errorEdges);
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

    private isAllowedCycle(originType: NodeType | undefined, targetTypeName: string): boolean {
        if (!originType) return false;

        // Check explicit allowed target
        if (originType.allowedCycleTarget === targetTypeName) return true;

        return false
    }

    private addCycleToResults(
        cycle: { cycle: string[]; backEdgeFrom: string; backEdgeTo: string },
        nodeMap: Map<string, Node>,
        edges: Edge[],
        addedNodes: Set<string>,
        addedEdges: Set<string>,
        errorNodes: Node[],
        errorEdges: Edge[]
    ): void {
        // Add nodes
        for (const id of cycle.cycle) {
            if (!addedNodes.has(id)) {
                const node = nodeMap.get(id);
                if (node) {
                    errorNodes.push(node);
                    addedNodes.add(id);
                }
            }
        }

        // Add edges (from consecutive pairs in cycle)
        for (let i = 0; i < cycle.cycle.length - 1; i++) {
            const fromId = cycle.cycle[i];
            const toId = cycle.cycle[i + 1];
            const edge = edges.find(e => e.fromNodeId === fromId && e.toNodeId === toId);
            if (edge) {
                const key = edge.id ?? `${fromId}->${toId}`;
                if (!addedEdges.has(key)) {
                    errorEdges.push(edge);
                    addedEdges.add(key);
                }
            }
        }
    }
}

export default new ValidationEngine();