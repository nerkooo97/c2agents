'use client';

import React, { useMemo } from 'react';
import ReactFlow, {
    Controls,
    Background,
    type Node,
    type Edge,
    type OnNodesChange,
    type OnEdgesChange,
    type OnConnect,
    type NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';

interface WorkflowGraphEditorProps {
    nodes: Node[];
    edges: Edge[];
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: OnConnect;
    nodeTypes: NodeTypes;
}

const WorkflowGraphEditor: React.FC<WorkflowGraphEditorProps> = ({
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    nodeTypes,
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
                fitView
                className="bg-muted/30"
            >
                <Controls />
                <Background gap={12} size={1} />
            </ReactFlow>
        </div>
    );
};

export default WorkflowGraphEditor;
