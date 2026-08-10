'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function RefreshAllButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch('/api/portfolio/refresh', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '更新に失敗しました');
      toast.success(`株価を更新しました（成功${data.updated}件${data.failed ? ` / 失敗${data.failed}件` : ''}）`);
      router.refresh();
    } catch (e) {
      toast.error(String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleClick} disabled={loading} variant="outline" size="sm">
      <RefreshCw className={loading ? 'animate-spin' : ''} />
      {loading ? '更新中…' : '株価を更新'}
    </Button>
  );
}
