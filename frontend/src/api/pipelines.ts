import axios from 'axios';
import type {
    SavePipelineResponse,
    SavePipelineRequest
} from '../types';

const API_BASE = 'http://localhost:3000/api';

export const savePipeline = async (pipeline: SavePipelineRequest): Promise<SavePipelineResponse> => {
    const res = await axios.post(`${API_BASE}/pipelines`, pipeline);
    return res.data;
};