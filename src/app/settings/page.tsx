
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BrainCircuit, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Settings {
    rag: {
        enabled: boolean;
        embeddingModel: string;
    };
}

export default function SettingsPage() {
    const [settings, setSettings] = useState<Settings>({
        rag: { enabled: true, embeddingModel: 'googleai/embedding-004' }
    });
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        // In a real app, you'd fetch these settings from a persistent store.
        // For this demo, we use localStorage.
        const savedSettings = localStorage.getItem('app-settings');
        if (savedSettings) {
            setSettings(JSON.parse(savedSettings));
        }
        setIsLoading(false);
    }, []);

    const handleSave = () => {
        // Persist settings to localStorage
        localStorage.setItem('app-settings', JSON.stringify(settings));
        toast({
            title: 'Settings Saved',
            description: 'Your settings have been updated successfully.',
        });
    };

    const handleSettingChange = <T extends keyof Settings>(section: T, key: keyof Settings[T], value: any) => {
        setSettings(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [key]: value
            }
        }));
    };
    
    if (isLoading) {
        return <p>Loading settings...</p>;
    }

    return (
        <div className="min-h-screen w-full bg-background flex flex-col">
            <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
                <div className="flex items-center gap-2">
                    <Link href="/" passHref>
                        <Button variant="outline" size="icon" className="h-8 w-8">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <h1 className="text-lg font-semibold md:text-xl">Settings</h1>
                </div>
                 <Button onClick={handleSave}>
                    <Save className="mr-2 h-4 w-4" /> Save Changes
                </Button>
            </header>
            <main className="flex-1 p-4 md:p-6 max-w-4xl mx-auto w-full">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold tracking-tight">Application Settings</h2>
                    <p className="text-muted-foreground">Configure external services and providers for your agents.</p>
                </div>
                
                <div className="space-y-8">
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BrainCircuit className="h-5 w-5" />
                                <span>RAG Retriever Settings</span>
                            </CardTitle>
                            <CardDescription>
                                Configure the Retrieval-Augmented Generation service. This is used by the 'retriever' tool.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                           <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Enable RAG</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Allow agents to use the internal knowledge base.
                                    </p>
                                </div>
                                <Switch
                                    checked={settings.rag.enabled}
                                    onCheckedChange={(value) => handleSettingChange('rag', 'enabled', value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="embedding-model">Embedding Model</Label>
                                <Select
                                    value={settings.rag.embeddingModel}
                                    onValueChange={(value) => handleSettingChange('rag', 'embeddingModel', value)}
                                    disabled={!settings.rag.enabled}
                                >
                                    <SelectTrigger id="embedding-model">
                                        <SelectValue placeholder="Select a model" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="googleai/embedding-004">Google - text-embedding-004</SelectItem>
                                        <SelectItem value="openai/text-embedding-3-small" disabled>OpenAI - text-embedding-3-small (coming soon)</SelectItem>
                                    </SelectContent>
                                </Select>
                                 <p className="text-xs text-muted-foreground">
                                    The model used to create vector embeddings for documents.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
