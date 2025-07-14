
'use client';

import { useCallback } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { PluginDefinition } from '@/lib/types';
import { Plug } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface PluginNodeData {
    pluginName: string;
    availablePlugins: PluginDefinition[];
    onChange: (id: string, field: 'pluginName', value: string) => void;
    isExecuting: boolean;
}

const PluginNode = ({ id, data }: NodeProps<PluginNodeData>) => {
    const { pluginName, availablePlugins = [], onChange, isExecuting } = data;

    const handleValueChange = useCallback(
        (value: string) => {
            onChange(id, 'pluginName', value);
        },
        [id, onChange]
    );

    return (
        <Card className={cn(
            "p-4 border-purple-500 shadow-lg rounded-lg w-80 bg-card transition-all duration-300",
            isExecuting && "border-2 border-purple-500 ring-4 ring-purple-500/20 animate-pulse"
        )}>
            <Handle type="target" position={Position.Top} className="!bg-purple-500" />
            <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
                    <Plug className="h-6 w-6 text-purple-500" />
                </div>
                <h4 className="text-base font-semibold">Plugin Step</h4>
            </div>
            <div className="space-y-3">
                <div>
                    <Label htmlFor={`plugin-select-${id}`} className="text-xs font-semibold uppercase text-muted-foreground">Select Plugin</Label>
                    <Select value={pluginName} onValueChange={handleValueChange}>
                        <SelectTrigger id={`plugin-select-${id}`} className="mt-1">
                            <SelectValue placeholder="Select a plugin..." />
                        </SelectTrigger>
                        <SelectContent>
                             {availablePlugins.length > 0 ? (
                                availablePlugins.map(plugin => (
                                    <SelectItem key={plugin.name} value={plugin.name}>{plugin.name}</SelectItem>
                                ))
                             ) : (
                                <SelectItem value="loading" disabled>Loading plugins...</SelectItem>
                             )}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <Handle type="source" position={Position.Bottom} className="!bg-purple-500" />
        </Card>
    );
};

export default PluginNode;
