import React, { useCallback, useEffect, useState } from 'react';
import { getNodeTypes, type NodeType } from '../api/nodeTypes';
import './Sidebar.css';


export default function Sidebar() {
    const [nodeTypes, setNodeTypes] = useState<NodeType[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchNodeTypes = async () => {
            try {
                const response = await getNodeTypes();
                setNodeTypes(response);
                setError(null);
            } catch (err) {
                console.error('Error fetching node types:', err);
                setError('Failed to load node types');
            }
        };

        fetchNodeTypes();
    }, []);

    const onDragStart = useCallback((event: React.DragEvent, nodeType: string) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    }, []);

    if (error) {
        return <div className="sidebar-error">{error}</div>;
    }

    return (
        <aside className="sidebar">
            <div className="sidebar-title">📦 Node Types</div>
            <div className="sidebar-subtitle">Drag to add to canvas</div>

            {nodeTypes.map((nodeType) => (
                <div
                    key={nodeType.name}
                    className="draggable-node"
                    onDragStart={(event) => onDragStart(event, nodeType.name)}
                    draggable
                >
                    {nodeType.name}
                </div>
            ))}
        </aside>
    );
};