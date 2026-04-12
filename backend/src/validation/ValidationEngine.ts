type Node = {
    name: string;
    type: string;
    positionX?: number;
    positionY?: number;
    pipelineId?: string;
}

type Edge = {
    id?: string;
    pipelineId?: string;
    fromNodeName: string;
    toNodeName: string;
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
}

export class ValidationEngine {

    private buildNodeMap(nodes: Node[]) {
        const map = new Map<string, Node>();
        for (const n of nodes) map.set(n.name, n);
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

    // Every node has specific inputs and outputs
    validateDataType(nodes: Node[], edges: Edge[], nodeTypes?: NodeType[] | Record<string, NodeType>): ValidationResult {
        const errors: string[] = [];
        const nodeMap = this.buildNodeMap(nodes);
        const typeMap = this.buildNodeTypeMap(nodeTypes);

        for (const e of edges) {
            const from = nodeMap.get(e.fromNodeName);
            const to = nodeMap.get(e.toNodeName);
            if (!from) { errors.push(`Edge ${e.id ?? ''} references missing from-node ${e.fromNodeName}`); continue; }
            if (!to) { errors.push(`Edge ${e.id ?? ''} references missing to-node ${e.toNodeName}`); continue; }

            const fromType = typeMap.get(from.type);
            const toType = typeMap.get(to.type);

            const fromOutput = fromType?.outputDataType ?? 'UNKNOWN';
            const toInput = toType?.inputDataType ?? 'UNKNOWN';

            if (fromOutput === 'UNKNOWN' || toInput === 'UNKNOWN') {
                errors.push(`Cannot determine data types for edge from ${from.name} (${from.type}) to ${to.name} (${to.type}).`);
                continue;
            }

            if (toInput === '*' || toInput.toLowerCase() === 'any') continue;

            if (fromOutput !== toInput) {
                errors.push(`Type mismatch on edge from ${from.name} (${from.type} -> ${fromOutput}) to ${to.name} (${to.type} expects ${toInput}).`);
            }
        }

        return { valid: errors.length === 0, errors };
    }

    // Merger Node must have two incoming connections
    // Two incoming connections cannot originate from the same parent node
    validateMerger(nodes: Node[], edges: Edge[], nodeTypes?: NodeType[] | Record<string, NodeType>): ValidationResult {
        const errors: string[] = [];
        const typeMap = this.buildNodeTypeMap(nodeTypes);

        const isMerger = (node: Node) => {
            const nt = typeMap.get(node.type);
            if (nt?.name) return /MERG|MERGER/i.test(nt.name);
            return /MERG|MERGER/i.test(node.type);
        };

        for (const n of nodes) {
            if (!isMerger(n)) continue;
            const incoming = edges.filter(e => e.toNodeName === n.name);
            if (incoming.length !== 2) {
                errors.push(`Document Merger node ${n.name} must have exactly two incoming connections, found ${incoming.length}.`);
                continue;
            }
            if (incoming[0].fromNodeName === incoming[1].fromNodeName) {
                errors.push(`Document Merger node ${n.name} has two incoming connections from the same parent ${incoming[0].fromNodeName}.`);
            }
        }

        return { valid: errors.length === 0, errors };
    }

    // No infinite loops
    // Human Review node can loop back to Text Correction node
    validateCycle(nodes: Node[], edges: Edge[], nodeTypes?: NodeType[] | Record<string, NodeType>): ValidationResult {
        const errors: string[] = [];
        const nodeMap = this.buildNodeMap(nodes);
        const typeMap = this.buildNodeTypeMap(nodeTypes);

        const adj = new Map<string, string[]>();
        for (const n of nodes) adj.set(n.name, []);
        for (const e of edges) {
            if (!adj.has(e.fromNodeName)) adj.set(e.fromNodeName, []);
            adj.get(e.fromNodeName)!.push(e.toNodeName);
        }

        const indegree = new Map<string, number>();
        for (const n of nodes) indegree.set(n.name, 0);
        for (const e of edges) indegree.set(e.toNodeName, (indegree.get(e.toNodeName) ?? 0) + 1);
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

        for (const n of nodes) if (!visited.has(n.name)) dfs(n.name);

        for (const c of cycles) {
            const includesSource = c.cycle.some(id => sources.has(id));
            if (includesSource) {
                errors.push(`Invalid cycle detected involving nodes [${c.cycle.join(', ')}] — cycles cannot include pipeline start nodes.`);
                continue;
            }

            const origin = nodeMap.get(c.backEdgeFrom)!;
            const target = nodeMap.get(c.backEdgeTo)!;
            const originType = typeMap.get(origin.type);
            const targetType = typeMap.get(target.type);

            const originName = originType?.name ?? origin.type;
            const targetName = targetType?.name ?? target.type;
            const allowedTarget = originType?.allowedCycleTarget ?? undefined;

            const originIsHuman = /HUMAN(_|\s)?REVIEW/i.test(originName) || (/HUMAN/i.test(originName) && /REVIEW/i.test(originName));
            const targetIsTextCorrection = /TEXT(_|\s)?CORRECTION/i.test(targetName) || (/CORRECT/i.test(targetName) && /TEXT/i.test(targetName));

            const allowed = (allowedTarget ? allowedTarget === targetName : (originIsHuman && targetIsTextCorrection));

            if (!allowed) {
                errors.push(`Invalid cycle closed by edge ${c.backEdgeFrom} -> ${c.backEdgeTo}. Only a Human Review node may create a cycle and it may only loop back to a Text Correction node.`);
            }
        }

        return { valid: errors.length === 0, errors };
    }

    validatePipeline(nodes: Node[], edges: Edge[], nodeTypes?: NodeType[] | Record<string, NodeType>): ValidationResult {
        const errors: string[] = [];
        const d = this.validateDataType(nodes, edges, nodeTypes);
        const m = this.validateMerger(nodes, edges, nodeTypes);
        const c = this.validateCycle(nodes, edges, nodeTypes);
        errors.push(...d.errors, ...m.errors, ...c.errors);
        return { valid: errors.length === 0, errors };
    }
}

export default new ValidationEngine();