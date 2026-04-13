import axios from 'axios';

const API_BASE = 'http://localhost:3000/api';

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

export const savePipeline = async (pipeline: SavePipelineRequest) => {
    const res = await axios.post(`${API_BASE}/pipelines`, pipeline);
    return res.data;
};