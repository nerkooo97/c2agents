
'use client';

import { useCallback } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Timer } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface DelayNodeData {
    delay: number;
    onChange: (id: string, field: 'delay', value: number) => void;
    isExecuting: boolean;
}

const DelayNode = ({ id, data }: NodeProps<DelayNodeData>) => {
    const { delay, onChange, isExecuting } = data;

    const handleValueChange = useCallback(
        (evt: React.ChangeEvent<HTMLInputElement>) => {
            onChange(id, 'delay', parseInt(evt.target.value, 10) || 0);
        },
        [id, onChange]
    );

    return (
        <Card className={cn(
            "p-4 border-accent shadow-lg rounded-lg w-80 bg-card transition-all duration-300",
            isExecuting && "border-2 border-amber-500 ring-4 ring-amber-500/20 animate-pulse"
        )}>
            <Handle type="target" position={Position.Left} className="!bg-accent" />
            <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                    <Timer className="h-6 w-6 text-accent-foreground" />
                </div>
                <h4 className="text-base font-semibold">Delay Step</h4>
            </div>
            <div className="space-y-3">
                <div>
                    <Label htmlFor={`delay-input-${id}`} className="text-xs font-semibold uppercase text-muted-foreground">Delay (ms)</Label>
                    <Input
                        id={`delay-input-${id}`}
                        type="number"
                        value={delay}
                        onChange={handleValueChange}
                        className="mt-1"
                        placeholder="e.g., 1000"
                    />
                </div>
            </div>
            <Handle type="source" position={Position.Right} className="!bg-accent" />
        </Card>
    );
};

export default DelayNode;
