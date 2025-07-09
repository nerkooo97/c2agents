'use client';

import React from 'react';
import ReactFlow, {
    Controls,
    Background,
    type Node,
    type Edge,
    type OnNodesChange,
    type OnEdgesChange,
    type OnConnect,
    type NodeTypes,
    type DefaultEdgeOptions,
} from 'reactflow';
import 'reactflow/dist/style.css';

interface WorkflowGraphEditorProps {
    nodes: Node[];
    edges: Edge[];
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: OnConnect;
    nodeTypes: NodeTypes;
    defaultEdgeOptions?: DefaultEdgeOptions;
}

const WorkflowGraphEditor: React.FC<WorkflowGraphEditorProps> = ({
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    nodeTypes,
    defaultEdgeOptions,
}) => {
    return (
        <div style={{ height: '100%', width: '100%' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                defaultEdgeOptions={defaultEdgeOptions}
                fitView
                className="bg-muted"
            >
                <Controls />
                <Background variant="lines" gap={24} size={1} color="hsl(var(--border))" />
            </ReactFlow>
        </div>
    );
};

export default WorkflowGraphEditor;
