
'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ToolFormData } from '@/lib/types';
import { ToolDefinitionSchema } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Bot, Home, MoreVertical, Pencil, PlusCircle, Trash2, Wrench, ArrowLeft } from 'lucide-react';

type ToolMetadata = {
  name: string;
  description: string;
};

// TOOL FORM COMPONENT
const ToolForm = ({
  tool,
  onSave,
  onClose,
}: {
  tool?: ToolFormData;
  onSave: (data: ToolFormData) => void;
  onClose: () => void;
}) => {
  const form = useForm<ToolFormData>({
    resolver: zodResolver(ToolDefinitionSchema),
    defaultValues: tool || {
      name: '',
      description: '',
      inputSchema: 'z.object({\n  query: z.string().describe("The user\'s search query.")\n})',
      functionBody: 'return `You searched for: ${input.query}`',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)} className="space-y-6 p-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tool Name</FormLabel>
              <FormControl><Input placeholder="e.g., weatherLookup" {...field} /></FormControl>
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
              <FormControl><Textarea placeholder="A short summary of what the tool does for the agent." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="inputSchema"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Input Schema (Zod)</FormLabel>
              <FormControl><Textarea placeholder="z.object({ city: z.string() })" className="min-h-[120px] font-code text-xs" {...field} /></FormControl>
              <FormDescription>Define the input data structure using Zod. The 'z' object is automatically available.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="functionBody"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tool Logic (Async Function Body)</FormLabel>
              <FormControl><Textarea placeholder="return `The weather in ${input.city} is sunny.`;" className="min-h-[160px] font-code text-xs" {...field} /></FormControl>
              <FormDescription>Write the body of the async function. You have access to an 'input' variable that matches your schema. Always return a value.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save Tool</Button>
        </div>
      </form>
    </Form>
  );
};

// TOOL CARD COMPONENT
const ToolCard = ({ 
    tool,
    onEdit,
    onDelete,
}: { 
    tool: ToolMetadata;
    onEdit: () => void;
    onDelete: () => void;
}) => {
  return (
    <Card className="flex flex-col justify-between transition-all hover:shadow-lg">
      <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Wrench className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <CardTitle>{tool.name}</CardTitle>
          <CardDescription>{tool.description}</CardDescription>
        </div>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={onEdit}><Pencil className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
          <p className="text-xs text-muted-foreground font-code bg-muted p-2 rounded-md">
            This tool is available for agents to use.
          </p>
      </CardContent>
    </Card>
  );
};


// MAIN TOOL BUILDER PAGE
export default function ToolBuilderPage() {
  const [tools, setTools] = useState<ToolMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<ToolFormData | undefined>(undefined);
  const [deletingTool, setDeletingTool] = useState<ToolMetadata | undefined>(undefined);

  const { toast } = useToast();

  const fetchTools = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/tools');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch tools');
      }
      const toolsData = await response.json();
      setTools(toolsData);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Failed to load tools',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTools();
  }, [toast]);

  const handleCreateNew = () => {
    setEditingTool(undefined);
    setIsSheetOpen(true);
  };

  const handleEdit = (tool: ToolMetadata) => {
    // Note: We don't have the schema/body here.
    // A more advanced implementation would need another API endpoint to fetch the full tool source.
    // For now, we'll open the form with the known data.
    toast({ title: "Editing Not Implemented", description: "Editing tool source code is not yet supported in this UI."});
  };
  
  const handleDelete = (tool: ToolMetadata) => {
    setDeletingTool(tool);
  };

  const confirmDelete = async () => {
    if (!deletingTool) return;

    try {
      const response = await fetch('/api/tools/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: deletingTool.name }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete tool');
      }

      setTools(prev => prev.filter(t => t.name !== deletingTool.name));
      toast({ title: "Tool Deleted", description: `Tool "${deletingTool.name}" has been deleted.` });
      
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
      toast({
        variant: 'destructive',
        title: 'Error deleting tool',
        description: errorMessage,
      });
    } finally {
      setDeletingTool(undefined);
    }
  };

  const handleSaveTool = async (data: ToolFormData) => {
    // For now, we only support creation, not editing.
    const isEditing = !!editingTool;
    if (isEditing) {
        // TODO: Implement update logic
        toast({ title: "Update Not Implemented", description: "Updating tools is not yet supported." });
        setIsSheetOpen(false);
        return;
    }

    try {
      const response = await fetch('/api/tools/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create tool');
      }

      await fetchTools(); // Refresh the list of tools
      toast({ title: "Tool Created", description: `Tool "${data.name}" has been created.` });

    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
      toast({
        variant: 'destructive',
        title: 'Error creating tool',
        description: errorMessage,
      });
    } finally {
      setIsSheetOpen(false);
      setEditingTool(undefined);
    }
  };
  
  const filteredTools = useMemo(() => {
    return tools.filter(tool =>
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [tools, searchQuery]);

  return (
    <div className="min-h-screen w-full bg-background flex flex-col">
       <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
        <div className="flex items-center gap-2">
            <Link href="/" passHref>
                <Button variant="outline" size="icon" className="h-8 w-8">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
            </Link>
            <h1 className="text-lg font-semibold md:text-xl">Tool Builder</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button onClick={handleCreateNew}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create Tool
          </Button>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-6">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Tool Management</h2>
                <p className="text-muted-foreground">Create, manage, and delete tools for your agents.</p>
            </div>
            <Input 
                placeholder="Search tools..." 
                className="max-w-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}><CardHeader><Skeleton className="h-6 w-1/2" /><Skeleton className="h-4 w-3/4" /></CardHeader><CardContent><Skeleton className="h-10 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : error ? (
            <div className="flex items-center justify-center rounded-lg border border-dashed p-8 text-center h-full"><div className="text-destructive">{error}</div></div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredTools.map(tool => (
              <ToolCard 
                key={tool.name} 
                tool={tool}
                onEdit={() => handleEdit(tool)}
                onDelete={() => handleDelete(tool)}
                />
            ))}
          </div>
        )}
      </main>

      {/* Sheet for Create/Edit */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-2xl w-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingTool ? 'Edit Tool' : 'Create New Tool'}</SheetTitle>
          </SheetHeader>
          <ToolForm
             tool={editingTool} 
             onSave={handleSaveTool} 
             onClose={() => setIsSheetOpen(false)}
            />
        </SheetContent>
      </Sheet>

      {/* Alert Dialog for Deleting */}
       <AlertDialog open={!!deletingTool} onOpenChange={(open) => !open && setDeletingTool(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              "{deletingTool?.name}" tool and its file.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    