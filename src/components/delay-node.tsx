
'use client';

import { useCallback } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Timer } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface DelayNodeData {
    delay: number;
    onChange: (id: string, field: 'delay', value: number) => void;
}

const DelayNode = ({ id, data }: NodeProps<DelayNodeData>) => {
    const { delay, onChange } = data;

    const handleValueChange = useCallback(
        (evt: React.ChangeEvent<HTMLInputElement>) => {
            onChange(id, 'delay', parseInt(evt.target.value, 10) || 0);
        },
        [id, onChange]
    );

    return (
        <Card className="p-4 border-accent shadow-lg rounded-lg w-80 bg-card">
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
