import { type Edge, type Node } from '@xyflow/react';
import { savePipeline } from '../api/pipelines';
import './SaveButton.css';
import { useState } from 'react';
import type { SavePipelineRequest } from '../types';

interface SaveButtonProps {
    nodes: Node[];
    edges: Edge[];
    pipelineId?: string;
    pipelineName?: string;
}

export default function SaveButton({
    nodes,
    edges,
    pipelineId = '',
    pipelineName = 'Untitled Pipeline'
}: SaveButtonProps) {
    const [isLoading, setIsLoading] = useState(false);

    const onClick = async () => {
        setIsLoading(true);

        try {
            // Transform React Flow nodes to API format
            const formattedNodes = nodes.map(node => ({
                id: node.id,
                type: node.data?.label as string || 'unknown',
                positionX: node.position.x,
                positionY: node.position.y,
            }));

            // Transform React Flow edges to API format
            const formattedEdges = edges.map(edge => ({
                fromNodeId: edge.source,
                toNodeId: edge.target,
            }));

            const requestData: SavePipelineRequest = {
                id: pipelineId,
                name: pipelineName,
                nodes: formattedNodes,
                edges: formattedEdges,
            };

            const response = await savePipeline(requestData);

            console.log('Pipeline saved successfully:', response);
            setIsLoading(false);

        } catch (err) {
            console.error('Failed to save pipeline:', err);
            setIsLoading(false);
            alert('Failed to save pipeline. Please try again.');
        }
    }

    return (
        <button
            className="save-button"
            onClick={onClick}
            disabled={isLoading}
            aria-label="Save flow"
        >
            {isLoading ? (
                <>
                    <span className="spinner"></span>
                    Saving...
                </>
            ) : (
                'Save Flow'
            )}
        </button>
    );
}