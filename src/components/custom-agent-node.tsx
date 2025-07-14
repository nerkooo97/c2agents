
'use client';

import { useCallback } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { AgentDefinition } from '@/lib/types';
import { Bot, Plug } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface CustomAgentNodeData {
    agentName: string;
    task: string;
    availableAgents: AgentDefinition[];
    onChange: (id: string, field: 'agentName' | 'task', value: string) => void;
    isExecuting: boolean;
}

const CustomAgentNode = ({ id, data }: NodeProps<CustomAgentNodeData>) => {
    const { agentName, task, availableAgents = [], onChange, isExecuting } = data;

    const handleSelectChange = useCallback(
        (value: string) => {
            onChange(id, 'agentName', value);
        },
        [id, onChange]
    );

    const handleTaskChange = useCallback(
        (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
            onChange(id, 'task', evt.target.value);
        },
        [id, onChange]
    );

    const selectedAgent = availableAgents.find(a => a.name === agentName);
    const placeholderText = selectedAgent?.defaultTask 
        ? `Uses agent's Core Task: "${selectedAgent.defaultTask}"`
        : "Define a specific task for this step, or set a Core Task in the agent's settings.";

    return (
        <Card className={cn(
            "p-4 border-primary shadow-lg rounded-lg w-80 bg-card relative transition-all duration-300",
            isExecuting && "border-2 border-primary ring-4 ring-primary/20 animate-pulse"
        )}>
            <Handle type="target" position={Position.Left} id="sequence-in" className="!bg-primary top-1/2" />

            <Handle
                type="target"
                position={Position.Top}
                id="plugin-in"
                className="!bg-purple-500 w-4 h-4"
                style={{ top: '-8px' }}
            >
                <Plug className="w-2.5 h-2.5 text-white" />
            </Handle>

            <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Bot className="h-6 w-6 text-primary" />
                </div>
                <h4 className="text-base font-semibold">Agent Step</h4>
            </div>
            <div className="space-y-3">
                <div>
                    <Label htmlFor={`agent-select-${id}`} className="text-xs font-semibold uppercase text-muted-foreground">Select Agent</Label>
                    <Select value={agentName} onValueChange={handleSelectChange}>
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
                    <Label htmlFor={`task-input-${id}`} className="text-xs font-semibold uppercase text-muted-foreground">Step Task</Label>
                    <Textarea
                        id={`task-input-${id}`}
                        value={task || ''}
                        onChange={handleTaskChange}
                        className="mt-1 min-h-[60px] text-sm"
                        placeholder={placeholderText}
                    />
                </div>
            </div>
            
            <Handle type="source" position={Position.Right} id="sequence-out" className="!bg-primary top-1/2" />
            
            <Handle
                type="source"
                position={Position.Bottom}
                id="plugin-out"
                className="!bg-purple-500 w-4 h-4"
                style={{ bottom: '-8px' }}
            >
                 <Plug className="w-2.5 h-2.5 text-white" />
            </Handle>
        </Card>
    );
};

export default CustomAgentNode;
