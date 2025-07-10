
'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bot, CheckCircle, Clock, Cpu, XCircle } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';

import type { AgentExecutionLog } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { ChartTooltipContent } from '@/components/ui/chart';

type Stats = {
    totalRuns: number;
    successRate: number;
    averageLatency: number;
    totalTokens: number;
};

type ChartData = {
    date: string;
    [key: string]: number | string;
};

export default function AnalyticsPage() {
    const [logs, setLogs] = useState<AgentExecutionLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchLogs = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/agents/all/logs?all=true');
                if (!response.ok) throw new Error('Failed to fetch logs.');
                const data = await response.json();
                setLogs(data);
            } catch (error) {
                toast({
                    variant: 'destructive',
                    title: 'Error fetching logs',
                    description: error instanceof Error ? error.message : 'Unknown error',
                });
            } finally {
                setIsLoading(false);
            }
        };
        fetchLogs();
    }, [toast]);

    const { stats, tokenChartData, latencyChartData } = useMemo(() => {
        if (!logs || logs.length === 0) {
            return {
                stats: { totalRuns: 0, successRate: 0, averageLatency: 0, totalTokens: 0 },
                tokenChartData: [],
                latencyChartData: [],
            };
        }

        const totalRuns = logs.length;
        const successfulRuns = logs.filter(log => log.status === 'success').length;
        const successRate = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0;
        const totalLatency = logs.reduce((acc, log) => acc + (log.latency ?? 0), 0);
        const averageLatency = totalRuns > 0 ? totalLatency / totalRuns : 0;
        const totalTokens = logs.reduce((acc, log) => acc + (log.totalTokens ?? 0), 0);

        const stats: Stats = {
            totalRuns,
            successRate,
            averageLatency,
            totalTokens,
        };

        // Prepare data for charts
        const agentNames = [...new Set(logs.map(l => l.agentName))];
        const last7Days = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), i), 'yyyy-MM-dd')).reverse();
        
        const tokenChartData = last7Days.map(date => {
            const dailyData: ChartData = { date: format(new Date(date), 'MMM d') };
            agentNames.forEach(name => {
                dailyData[name] = logs
                    .filter(l => format(new Date(l.timestamp), 'yyyy-MM-dd') === date && l.agentName === name)
                    .reduce((acc, l) => acc + (l.totalTokens ?? 0), 0);
            });
            return dailyData;
        });

        const latencyByAgent = agentNames.map(name => {
            const agentLogs = logs.filter(l => l.agentName === name && l.latency != null);
            const avgLatency = agentLogs.length > 0
                ? agentLogs.reduce((acc, l) => acc + (l.latency ?? 0), 0) / agentLogs.length
                : 0;
            return { name, avgLatency: parseFloat((avgLatency / 1000).toFixed(2)) };
        });

        return { stats, tokenChartData, latencyChartData: latencyByAgent };
    }, [logs]);

    return (
        <div className="min-h-screen w-full bg-background flex flex-col">
            <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
                <div className="flex items-center gap-2">
                    <Link href="/" passHref>
                        <Button variant="outline" size="icon" className="h-8 w-8">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <h1 className="text-lg font-semibold md:text-xl">Analytics</h1>
                </div>
            </header>
            <main className="flex-1 p-4 md:p-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
                    {isLoading ? (
                        [...Array(4)].map((_, i) => (
                            <Card key={i}><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><Skeleton className="h-8 w-1/2" /></CardContent></Card>
                        ))
                    ) : (
                        <>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total Runs</CardTitle>
                                    <Cpu className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stats.totalRuns}</div>
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</div>
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Avg. Latency</CardTitle>
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{(stats.averageLatency / 1000).toFixed(2)}s</div>
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total Tokens Used</CardTitle>
                                    <Bot className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stats.totalTokens.toLocaleString()}</div>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Token Usage (Last 7 Days)</CardTitle>
                            <CardDescription>Total tokens used per agent daily.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             {isLoading ? <Skeleton className="h-[300px] w-full" /> : (
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={tokenChartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                                        <Tooltip content={<ChartTooltipContent />} />
                                        <Legend />
                                        {[...new Set(logs.map(l => l.agentName))].map((name, i) => (
                                            <Bar key={name} dataKey={name} stackId="a" fill={`var(--chart-${(i % 5) + 1})`} />
                                        ))}
                                    </BarChart>
                                </ResponsiveContainer>
                             )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Average Latency by Agent</CardTitle>
                            <CardDescription>Average response time in seconds for each agent.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             {isLoading ? <Skeleton className="h-[300px] w-full" /> : (
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={latencyChartData} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis dataKey="name" type="category" fontSize={12} tickLine={false} axisLine={false} width={120} />
                                        <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} />
                                        <Bar dataKey="avgLatency" name="Avg Latency (s)" fill="var(--chart-2)" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                             )}
                        </CardContent>
                    </Card>
                </div>

                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Recent Executions</CardTitle>
                        <CardDescription>A log of the most recent agent runs.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         {isLoading ? (
                            <div className="space-y-2">
                                {[...Array(5)].map((_,i) => <Skeleton key={i} className="h-10 w-full" />)}
                            </div>
                         ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Agent</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Latency</TableHead>
                                        <TableHead>Total Tokens</TableHead>
                                        <TableHead>Timestamp</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.slice(0, 10).map(log => (
                                        <TableRow key={log.id}>
                                            <TableCell className="font-medium">{log.agentName}</TableCell>
                                            <TableCell>
                                                {log.status === 'success' ? (
                                                    <span className="flex items-center gap-2 text-green-600"><CheckCircle className="h-4 w-4" /> Success</span>
                                                ) : (
                                                    <span className="flex items-center gap-2 text-red-600"><XCircle className="h-4 w-4" /> Error</span>
                                                )}
                                            </TableCell>
                                            <TableCell>{log.latency ? `${(log.latency / 1000).toFixed(2)}s` : 'N/A'}</TableCell>
                                            <TableCell>{log.totalTokens?.toLocaleString() ?? 'N/A'}</TableCell>
                                            <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                         )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
