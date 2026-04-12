import axios from 'axios';
import type {
    NodeType,
} from '../types';

const API_BASE = 'http://localhost:3000/api';

export const getNodeTypes = async (): Promise<NodeType[]> => {
    const res = await axios.get(`${API_BASE}/nodeTypes`);
    return res.data;
};