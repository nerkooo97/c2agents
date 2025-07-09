
'use client';

import { Handle, Position, type NodeProps } from 'reactflow';
import { Target } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const GoalNode = ({ data }: NodeProps) => {
    return (
        <Card className="p-4 border-dashed border-primary shadow-lg rounded-lg w-80 bg-card/50">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Target className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h4 className="text-base font-semibold">Workflow Start</h4>
                    <p className="text-sm text-muted-foreground">The overall goal defined above.</p>
                </div>
            </div>
            <Handle type="source" position={Position.Right} className="!bg-primary" />
        </Card>
    );
};

export default GoalNode;
