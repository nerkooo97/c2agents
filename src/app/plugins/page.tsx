
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PluginDefinition, PluginFormSchema, PluginFormData } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, PlusCircle, Trash2, Edit, Server, Terminal, KeyRound } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

const PluginForm = ({
  plugin,
  onSave,
  onClose,
}: {
  plugin?: PluginDefinition;
  onSave: (data: PluginFormData, originalName?: string) => void;
  onClose: () => void;
}) => {
  const form = useForm<PluginFormData>({
    resolver: zodResolver(PluginFormSchema),
    defaultValues: {
      name: plugin?.name || '',
      description: plugin?.description || '',
      command: plugin?.command || 'npx',
      args: plugin?.args.join(' ') || '',
      env: plugin?.env ? JSON.stringify(plugin.env, null, 2) : '',
      enabled: plugin?.enabled ?? true,
    },
  });

  const onSubmit = (data: PluginFormData) => {
    onSave(data, plugin?.name);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Plugin Name</FormLabel>
              <FormControl><Input placeholder="e.g., filesystem-tool" {...field} disabled={!!plugin} /></FormControl>
              <FormDescription>A unique name for this plugin (letters, numbers, -). Cannot be changed after creation.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl><Input placeholder="A short summary of what this plugin provides." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="command"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Command</FormLabel>
              <FormControl><Input placeholder="e.g., npx, node, python" {...field} /></FormControl>
               <FormDescription>The executable to run for the MCP server.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="args"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Arguments</FormLabel>
              <FormControl><Textarea placeholder="-y @modelcontextprotocol/server-everything" {...field} /></FormControl>
              <FormDescription>Space-separated arguments for the command.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="env"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Environment Variables (JSON)</FormLabel>
              <FormControl><Textarea placeholder='{ "API_KEY": "your-key-here" }' {...field} /></FormControl>
              <FormDescription>API keys and other environment variables in JSON format.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
            control={form.control}
            name="enabled"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <FormLabel>Enabled</FormLabel>
                   <p className="text-xs text-muted-foreground">Enable this plugin to be loaded at startup.</p>
                </div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              </FormItem>
            )}
          />
        <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save Plugin</Button>
        </div>
      </form>
    </Form>
  );
};

export default function McpPluginsPage() {
  const [plugins, setPlugins] = useState<PluginDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingPlugin, setEditingPlugin] = useState<PluginDefinition | null>(null);
  const [deletingPlugin, setDeletingPlugin] = useState<PluginDefinition | null>(null);

  const { toast } = useToast();

  const fetchPlugins = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/plugins');
      if (!response.ok) throw new Error('Failed to fetch plugins.');
      const data = await response.json();
      setPlugins(data);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Could not fetch plugins.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPlugins();
  }, [fetchPlugins]);

  const handleCreateNew = () => {
    setEditingPlugin(null);
    setIsSheetOpen(true);
  };
  
  const handleEdit = (plugin: PluginDefinition) => {
    setEditingPlugin(plugin);
    setIsSheetOpen(true);
  };
  
  const handleDelete = async () => {
    if (!deletingPlugin) return;
    try {
        const response = await fetch('/api/plugins/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: deletingPlugin.name }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete plugin');
        }
        toast({ title: "Plugin Deleted", description: `"${deletingPlugin.name}" has been deleted.` });
        fetchPlugins();
    } catch (e) {
        toast({
            variant: "destructive",
            title: "Error deleting plugin",
            description: e instanceof Error ? e.message : 'Could not delete plugin.',
        });
    } finally {
        setDeletingPlugin(null);
    }
  };
  
  const handleSave = async (formData: PluginFormData, originalName?: string) => {
    const isEditing = !!originalName;
    const apiEndpoint = isEditing ? '/api/plugins/update' : '/api/plugins/create';
    const body = isEditing 
        ? JSON.stringify({ originalName, pluginData: formData }) 
        : JSON.stringify(formData);
        
    try {
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save plugin');
        }
        
        toast({ 
            title: `Plugin ${isEditing ? 'Updated' : 'Created'}`, 
            description: `"${formData.name}" has been saved. You may need to restart the application for changes to take effect.`
        });
        fetchPlugins();
    } catch(e) {
        toast({
            variant: "destructive",
            title: `Error saving plugin`,
            description: e instanceof Error ? e.message : 'Could not save plugin.',
        });
    } finally {
        setIsSheetOpen(false);
        setEditingPlugin(null);
    }
  };
  
  const handleToggle = async (plugin: PluginDefinition) => {
      const updatedPluginData: PluginFormData = {
          ...plugin,
          args: plugin.args.join(' '),
          env: plugin.env ? JSON.stringify(plugin.env) : '',
          enabled: !plugin.enabled,
      };
      await handleSave(updatedPluginData, plugin.name);
  };

  return (
    <div className="min-h-screen w-full bg-background flex flex-col">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
        <div className="flex items-center gap-2">
          <Link href="/" passHref>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold md:text-xl">Plugins</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleCreateNew}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Plugin
          </Button>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Manage Plugins</h2>
          <p className="text-muted-foreground">Add, configure, and manage your MCP-compatible plugins.</p>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i}><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><Skeleton className="h-20 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : plugins.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center h-64">
            <Server className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No Plugins Found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Add your first plugin to provide new capabilities to your agents.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {plugins.map(plugin => (
              <Card key={plugin.name} className="flex flex-col">
                <CardHeader className="flex-row items-start justify-between gap-4 pb-4">
                  <div className="flex items-center gap-3">
                    <Server className="h-6 w-6 text-primary" />
                    <CardTitle className="text-lg">{plugin.name}</CardTitle>
                  </div>
                   <Switch checked={plugin.enabled} onCheckedChange={() => handleToggle(plugin)} />
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <p className="text-sm text-muted-foreground min-h-[40px]">
                    {plugin.description || 'No description provided.'}
                  </p>
                  <Separator/>
                  <div className="space-y-2 font-code text-xs">
                    <div className="flex items-start gap-3">
                      <Terminal className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <p className="break-all">
                        <span className="font-semibold">{plugin.command}</span> {plugin.args.join(' ')}
                      </p>
                    </div>
                    {plugin.env && Object.keys(plugin.env).length > 0 && (
                      <div className="flex items-start gap-3">
                        <KeyRound className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <p className="break-all text-muted-foreground">
                          {Object.keys(plugin.env).join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4">
                    <div className="flex w-full justify-end gap-2">
                        <Button variant="ghost" onClick={() => handleEdit(plugin)}>
                            <Edit className="mr-2 h-4 w-4"/> Edit
                        </Button>
                        <Button variant="destructive" onClick={() => setDeletingPlugin(plugin)}>
                            <Trash2 className="mr-2 h-4 w-4"/> Delete
                        </Button>
                    </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
      
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-xl w-full">
            <SheetHeader>
                <SheetTitle>{editingPlugin ? 'Edit Plugin' : 'Add New Plugin'}</SheetTitle>
                <SheetDescription>
                    Configure an MCP server to provide new tools to your agents.
                </SheetDescription>
            </SheetHeader>
            <PluginForm 
                plugin={editingPlugin!}
                onSave={handleSave}
                onClose={() => setIsSheetOpen(false)}
            />
        </SheetContent>
      </Sheet>
      
       <AlertDialog open={!!deletingPlugin} onOpenChange={(open) => !open && setDeletingPlugin(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete the plugin configuration for "{deletingPlugin?.name}". This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
