'use client';

import { useCallback } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { AgentDefinition } from '@/lib/types';
import { Bot } from 'lucide-react';

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
        <Card className="p-4 border-primary shadow-lg rounded-lg w-80 bg-card">
            <Handle type="target" position={Position.Left} className="!bg-primary" />
            <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Bot className="h-6 w-6 text-primary" />
                </div>
                <h4 className="text-base font-semibold">Agent Task</h4>
            </div>
            <div className="space-y-3">
                <div>
                    <Label htmlFor={`agent-select-${id}`} className="text-xs font-semibold uppercase text-muted-foreground">Agent</Label>
                    <Select value={agentName} onValueChange={(value) => handleValueChange('agentName', value)}>
                        <SelectTrigger id={`agent-select-${id}`} className="mt-1">
                            <SelectValue placeholder="Select an agent..." />
                        </SelectTrigger>
                        <SelectContent>
                             {availableAgents.length > 0 ? (
                                availableAgents.map(agent => (
                                    <SelectItem key={agent.name} value={agent.name}>{agent.name}</SelectItem>
                                ))
                             ) : (
                                <SelectItem value="loading" disabled>Loading agents...</SelectItem>
                             )}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor={`task-input-${id}`} className="text-xs font-semibold uppercase text-muted-foreground">Task</Label>
                    <Textarea
                        id={`task-input-${id}`}
                        placeholder="Describe the task for this agent..."
                        value={task}
                        onChange={(e) => handleValueChange('task', e.target.value)}
                        className="nodrag mt-1"
                    />
                </div>
            </div>
            <Handle type="source" position={Position.Right} className="!bg-primary" />
        </Card>
    );
};

export default CustomAgentNode;
