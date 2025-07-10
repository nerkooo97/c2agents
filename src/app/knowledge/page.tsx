// This is a new file for the RAG Knowledge Base UI.
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, PlusCircle, Trash2, FileText, UploadCloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface KnowledgeDocument {
    id: string;
    filename: string;
    content: string;
}

export default function KnowledgePage() {
    const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [deletingDoc, setDeletingDoc] = useState<KnowledgeDocument | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { toast } = useToast();

    const fetchDocuments = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/knowledge');
            if (!response.ok) throw new Error('Failed to fetch documents.');
            const data = await response.json();
            setDocuments(data);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error instanceof Error ? error.message : 'Could not fetch knowledge documents.',
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);
    
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const formData = new FormData();
        for (const file of files) {
            formData.append('files', file);
        }
        
        setIsUploading(true);
        try {
            const response = await fetch('/api/knowledge/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Upload failed');
            }
            
            toast({
                title: 'Success',
                description: `${files.length} document(s) uploaded successfully.`,
            });
            await fetchDocuments();

        } catch (error) {
             toast({
                variant: 'destructive',
                title: 'Upload Error',
                description: error instanceof Error ? error.message : 'An unknown error occurred.',
            });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDelete = async () => {
        if (!deletingDoc) return;
        
        try {
            const response = await fetch('/api/knowledge/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: deletingDoc.id }),
            });

            if (!response.ok) {
                 const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete');
            }

            toast({
                title: 'Document Deleted',
                description: `"${deletingDoc.filename}" has been removed from the knowledge base.`,
            });

            setDocuments(docs => docs.filter(d => d.id !== deletingDoc.id));

        } catch (error) {
             toast({
                variant: 'destructive',
                title: 'Deletion Error',
                description: error instanceof Error ? error.message : 'Could not delete the document.',
            });
        } finally {
            setDeletingDoc(null);
        }
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
                    <h1 className="text-lg font-semibold md:text-xl">Knowledge Base</h1>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        multiple
                        accept=".txt,.md"
                        className="hidden"
                    />
                     <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                        <UploadCloud className="mr-2 h-4 w-4" />
                        {isUploading ? 'Uploading...' : 'Upload Documents'}
                    </Button>
                </div>
            </header>
            <main className="flex-1 p-4 md:p-6">
                 <div className="mb-6">
                    <h2 className="text-2xl font-bold tracking-tight">Manage Documents</h2>
                    <p className="text-muted-foreground">Upload, view, and delete documents for your RAG agents.</p>
                </div>

                {isLoading ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {[...Array(4)].map((_, i) => (
                        <Card key={i}><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3 mt-2" /></CardContent></Card>
                        ))}
                    </div>
                ) : documents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center h-64">
                        <FileText className="h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">No Documents Found</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                        Upload your first document to start building your knowledge base.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {documents.map(doc => (
                            <Card key={doc.id} className="flex flex-col">
                                <CardHeader className="flex-row items-start justify-between gap-4 pb-4">
                                    <div className="flex-1">
                                        <CardTitle className="text-base break-all">{doc.filename}</CardTitle>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setDeletingDoc(doc)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <p className="text-sm text-muted-foreground line-clamp-3">
                                        {doc.content}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </main>

            <AlertDialog open={!!deletingDoc} onOpenChange={(open) => !open && setDeletingDoc(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the document "{deletingDoc?.filename}" from your knowledge base. This action cannot be undone.
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
