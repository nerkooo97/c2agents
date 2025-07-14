
'use client';

import { Handle, Position, type NodeProps } from 'reactflow';
import { Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface GoalNodeData {
    isExecuting: boolean;
}

const GoalNode = ({ data }: NodeProps<GoalNodeData>) => {
    const { isExecuting } = data;
    
    return (
        <Card className={cn(
            "p-4 border-dashed border-primary shadow-lg rounded-lg w-80 bg-card/50 transition-all duration-300",
             isExecuting && "border-2 border-primary ring-4 ring-primary/20 animate-pulse"
        )}>
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
