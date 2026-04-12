import FlowCanvas from './components/FlowCanvas';
import Sidebar from './components/Sidebar';
import SaveButton from './components/SaveButton';
import { ReactFlowProvider, type Edge, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useState } from 'react';

function App() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  return (
    <ReactFlowProvider>
      <Sidebar />
      <SaveButton nodes={nodes} edges={edges} />
      <FlowCanvas nodes={nodes} edges={edges} setNodes={setNodes} setEdges={setEdges} />
    </ ReactFlowProvider>
  )
}

export default App
