
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, KeyRound, CheckCircle, Circle, Server } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { AppSettings, IntegrationDefinition } from '@/lib/types';

// Define available integrations here. In a real app, this might come from a config file.
const AVAILABLE_INTEGRATIONS: IntegrationDefinition[] = [
    {
        id: 'firecrawl',
        name: 'Firecrawl Scraper',
        description: 'A powerful web scraper that can handle complex JavaScript-heavy sites.',
        icon: Server,
        toolName: 'firecrawlScraper', // This should match a real tool name
    },
    // Add other pre-defined integrations here
];


export default function IntegrationsPage() {
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [installingIntegration, setInstallingIntegration] = useState<IntegrationDefinition | null>(null);
    const [apiKey, setApiKey] = useState('');
    const { toast } = useToast();

    useEffect(() => {
        // Fetch settings from localStorage
        const savedSettings = localStorage.getItem('app-settings');
        if (savedSettings) {
            setSettings(JSON.parse(savedSettings));
        } else {
            setSettings({ rag: { enabled: true, embeddingModel: 'googleai/embedding-004' }, integrations: {} });
        }
        setIsLoading(false);
    }, []);

    const handleSaveSettings = (newSettings: AppSettings) => {
        localStorage.setItem('app-settings', JSON.stringify(newSettings));
        setSettings(newSettings);
        toast({
            title: 'Integration settings updated',
        });
    };

    const handleInstallClick = (integration: IntegrationDefinition) => {
        setApiKey(''); // Reset API key field
        setInstallingIntegration(integration);
    };

    const handleConfirmInstall = () => {
        if (!installingIntegration || !settings) return;

        const newSettings: AppSettings = {
            ...settings,
            integrations: {
                ...settings.integrations,
                [installingIntegration.id]: {
                    installed: true,
                    apiKey: apiKey,
                },
            },
        };

        handleSaveSettings(newSettings);
        setInstallingIntegration(null);
    };

    const handleUninstall = (integrationId: string) => {
        if (!settings) return;
        
        const newIntegrations = { ...settings.integrations };
        delete newIntegrations[integrationId];
        
        const newSettings: AppSettings = {
            ...settings,
            integrations: newIntegrations,
        };
        
        handleSaveSettings(newSettings);
    };

    const isInstalled = (integrationId: string) => {
        return settings?.integrations?.[integrationId]?.installed === true;
    };
    
    if (isLoading) {
        return <div className="p-6">Loading...</div>;
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
                    <h1 className="text-lg font-semibold md:text-xl">Integrations</h1>
                </div>
            </header>
            <main className="flex-1 p-4 md:p-6 max-w-6xl mx-auto w-full">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold tracking-tight">Manage Integrations</h2>
                    <p className="text-muted-foreground">Install and configure external services to expand your agents' capabilities.</p>
                </div>
                
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {AVAILABLE_INTEGRATIONS.map((integration) => {
                        const installed = isInstalled(integration.id);
                        const Icon = integration.icon;

                        return (
                            <Card key={integration.id}>
                                <CardHeader>
                                    <div className="flex items-center gap-4">
                                        <Icon className="h-8 w-8 text-muted-foreground" />
                                        <CardTitle>{integration.name}</CardTitle>
                                    </div>
                                    <CardDescription className="pt-2">{integration.description}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center space-x-2 text-sm">
                                        {installed ? <CheckCircle className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                                        <span className={installed ? 'text-green-600 font-semibold' : 'text-muted-foreground'}>
                                            {installed ? 'Installed' : 'Not Installed'}
                                        </span>
                                    </div>
                                </CardContent>
                                <CardContent className="flex justify-end">
                                    {installed ? (
                                        <Button variant="destructive" onClick={() => handleUninstall(integration.id)}>Uninstall</Button>
                                    ) : (
                                        <Button onClick={() => handleInstallClick(integration)}>Install</Button>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </main>

            <AlertDialog open={!!installingIntegration} onOpenChange={(open) => !open && setInstallingIntegration(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Install {installingIntegration?.name}</AlertDialogTitle>
                        <AlertDialogDescription>
                            Please provide the necessary configuration to install this integration.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                        <Label htmlFor="api-key" className="flex items-center gap-2 mb-2">
                             <KeyRound className="h-4 w-4" />
                            <span>API Key</span>
                        </Label>
                        <Input
                            id="api-key"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Enter your API key"
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmInstall}>Install Integration</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
