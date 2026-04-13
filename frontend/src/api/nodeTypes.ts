import axios from 'axios';

const API_BASE = 'http://localhost:3000/api';

export interface NodeType {
    name: string;                    // Primary key from NodeType model
    inputDataType: string;
    outputDataType: string;
    allowedCycleTarget: string | null;
}

export const getNodeTypes = async (): Promise<NodeType[]> => {
    const res = await axios.get(`${API_BASE}/nodeTypes`);
    return res.data;
};