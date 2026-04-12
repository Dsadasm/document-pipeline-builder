import axios from 'axios';
import type { 
  NodeType, 
  Pipeline, 
  PipelineWithBackendIds,
  CreatePipelineRequest, 
  UpdatePipelineRequest 
} from '../types';

const API_BASE = 'http://localhost:3000/api';

export const getNodeTypes = async (): Promise<NodeType[]> => {
  const res = await axios.get(`${API_BASE}/nodeType`);
  return res.data;
};

export const getPipelines = async (): Promise<Pipeline[]> => {
  const res = await axios.get(`${API_BASE}/pipeline`);
  return res.data;
};

export const getPipeline = async (id: string): Promise<PipelineWithBackendIds> => {
  const res = await axios.get(`${API_BASE}/pipeline/${id}`);
  return res.data;
};

export const createPipeline = async (pipeline: CreatePipelineRequest): Promise<PipelineWithBackendIds> => {
  const res = await axios.post(`${API_BASE}/pipeline`, pipeline);
  return res.data;
};

export const updatePipeline = async (pipeline: UpdatePipelineRequest): Promise<PipelineWithBackendIds> => {
  const res = await axios.post(`${API_BASE}/pipeline`, pipeline);
  return res.data;
};

export const deletePipeline = async (id: string): Promise<void> => {
  await axios.delete(`${API_BASE}/pipeline/${id}`);
};