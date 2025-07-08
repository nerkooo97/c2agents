'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center space-y-4">
      <p className="text-muted-foreground">Redirecting to the dashboard...</p>
      <Skeleton className="h-8 w-64" />
    </div>
  );
}
