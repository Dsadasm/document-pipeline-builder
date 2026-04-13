import FlowCanvas from './components/FlowCanvas';
import Sidebar from './components/Sidebar';
import SaveButton from './components/SaveButton';
import { ReactFlowProvider, type Edge, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useState } from 'react';

function App() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [errorNodeIds, setErrorNodeIds] = useState<Set<string>>(new Set());
  const [errorEdgeIds, setErrorEdgeIds] = useState<Set<string>>(new Set());

  // Apply red styling to nodes/edges with validation errors
  const getNodeStyle = useCallback((node: Node) => {
    const hasError = errorNodeIds.has(node.id);
    return {
      ...node.style,
      border: hasError ? '2px solid #ff0000' : node.style?.border,
      backgroundColor: hasError ? '#ffebee' : node.style?.backgroundColor,
      boxShadow: hasError ? '0 0 0 2px rgba(255, 0, 0, 0.3)' : node.style?.boxShadow,
    };
  }, [errorNodeIds]);

  const getEdgeStyle = useCallback((edge: Edge) => {
    const hasError = errorEdgeIds.has(edge.id);
    return {
      ...edge.style,
      stroke: hasError ? '#ff0000' : edge.style?.stroke,
      strokeWidth: hasError ? 3 : edge.style?.strokeWidth || 2,
    };
  }, [errorEdgeIds]);

  // Transform nodes with error styling
  const styledNodes = nodes.map(node => ({
    ...node,
    style: getNodeStyle(node),
    data: {
      ...node.data,
      // Optional: Add error indicator in node label
      hasError: errorNodeIds.has(node.id),
    }
  }));

  // Transform edges with error styling
  const styledEdges = edges.map(edge => ({
    ...edge,
    style: getEdgeStyle(edge),
  }));

  const handleValidationError = (errorNodes: string[], errorEdges: string[]) => {
    setErrorNodeIds(new Set(errorNodes));
    setErrorEdgeIds(new Set(errorEdges));

    setTimeout(() => {
        setErrorNodeIds(new Set());
        setErrorEdgeIds(new Set());
    }, 5000);
  };


  return (
    <ReactFlowProvider>
      <Sidebar />
      <SaveButton nodes={nodes} edges={edges} onValidationError={handleValidationError} />
      <FlowCanvas nodes={styledNodes} edges={styledEdges} setNodes={setNodes} setEdges={setEdges} />
    </ ReactFlowProvider>
  )
}

export default App
