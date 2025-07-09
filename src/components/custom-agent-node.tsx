'use client';

import { useCallback } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { AgentDefinition } from '@/lib/types';

import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CustomAgentNodeData {
    agentName: string;
    task: string;
    availableAgents: AgentDefinition[];
    onChange: (id: string, field: 'agentName' | 'task', value: string) => void;
}

const CustomAgentNode = ({ id, data }: NodeProps<CustomAgentNodeData>) => {
    const { agentName, task, availableAgents = [], onChange } = data;

    const handleValueChange = useCallback(
        (field: 'agentName' | 'task', value: string) => {
            onChange(id, field, value);
        },
        [id, onChange]
    );

    return (
        <Card className="p-4 border-primary shadow-lg rounded-lg w-80">
            <Handle type="target" position={Position.Left} className="!bg-primary" />
            <div className="flex items-center gap-4 mb-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">?</span>
                <h4 className="font-semibold">Plan Step</h4>
            </div>
            <div className="space-y-3">
                <div>
                    <Label htmlFor={`agent-select-${id}`}>Agent</Label>
                    <Select value={agentName} onValueChange={(value) => handleValueChange('agentName', value)}>
                        <SelectTrigger id={`agent-select-${id}`}>
                            <SelectValue placeholder="Select an agent..." />
                        </SelectTrigger>
                        <SelectContent>
                            {availableAgents.map(agent => (
                                <SelectItem key={agent.name} value={agent.name}>{agent.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor={`task-input-${id}`}>Task</Label>
                    <Textarea
                        id={`task-input-${id}`}
                        placeholder="Describe the task for this agent..."
                        value={task}
                        onChange={(e) => handleValueChange('task', e.target.value)}
                        className="nodrag"
                    />
                </div>
            </div>
            <Handle type="source" position={Position.Right} className="!bg-primary" />
        </Card>
    );
};

export default CustomAgentNode;
