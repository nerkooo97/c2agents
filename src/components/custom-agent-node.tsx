'use client';

import { useCallback } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { AgentDefinition } from '@/lib/types';
import { Bot } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CustomAgentNodeData {
    agentName: string;
    availableAgents: AgentDefinition[];
    onChange: (id: string, field: 'agentName', value: string) => void;
}

const CustomAgentNode = ({ id, data }: NodeProps<CustomAgentNodeData>) => {
    const { agentName, availableAgents = [], onChange } = data;

    const handleValueChange = useCallback(
        (value: string) => {
            onChange(id, 'agentName', value);
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
                <h4 className="text-base font-semibold">Agent Step</h4>
            </div>
            <div className="space-y-3">
                <div>
                    <Label htmlFor={`agent-select-${id}`} className="text-xs font-semibold uppercase text-muted-foreground">Select Agent</Label>
                    <Select value={agentName} onValueChange={handleValueChange}>
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
            </div>
            <Handle type="source" position={Position.Right} className="!bg-primary" />
        </Card>
    );
};

export default CustomAgentNode;
