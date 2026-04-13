import { type Edge, type Node } from '@xyflow/react';
import { savePipeline, type SavePipelineRequest } from '../api/pipelines';
import './SaveButton.css';
import { useState } from 'react';

interface SaveButtonProps {
    nodes: Node[];
    edges: Edge[];
    pipelineName?: string;
    onValidationError?: (errorNodeIds: string[], errorEdgeIds: string[]) => void;
}

export default function SaveButton({
    nodes,
    edges,
    pipelineName = 'Untitled Pipeline',
    onValidationError
}: SaveButtonProps) {
    const [pipelineId, setPipelineId] = useState<string>('');
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
                id: edge.id,
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
            setPipelineId(response.id);

            if (onValidationError) {
                onValidationError([], []);
            }

            console.log('Pipeline saved successfully:', response);
        } catch (err: any) {
            // Check if this is a validation error with the expected structure
            if (err.response?.data?.errorNodeIds && err.response?.data?.errorEdgeIds) {
                const { errors, errorNodeIds, errorEdgeIds } = err.response.data;

                // Pass the error IDs to parent component via callback
                if (onValidationError) {
                    onValidationError(errorNodeIds, errorEdgeIds);
                }

                //alert(errors.join('\n'));
            } else {
                console.error('Failed to save pipeline:', err);
                alert('Failed to save pipeline. Please try again.');
            }
        } finally {
            setIsLoading(false);
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