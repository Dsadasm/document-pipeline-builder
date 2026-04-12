export interface NodeType {
    name: string;                    // Primary key from NodeType model
    inputDataType: string;
    outputDataType: string;
    allowedCycleTarget: string | null;
}

// API Request/Response types
export interface SavePipelineRequest {
    id: string;
    name: string;
    nodes: Array<{
        id: string;
        type: string;
        positionX: number;
        positionY: number;
    }>;
    edges: Array<{
        fromNodeId: string;
        toNodeId: string;
    }>;
}

export interface SavePipelineResponse {
    message: string;
    id: string;
}