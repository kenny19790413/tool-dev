'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Props {
  assetId: number;
  message: string;
  ratio: number;
  quantity: number | null;
  avgCost: number | null;
}

export function SplitAlertBanner({ assetId, message, ratio, quantity, avgCost }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<'apply' | 'dismiss' | null>(null);

  async function handleApply() {
    setLoading('apply');
    try {
      const body: Record<string, unknown> = { clearSplitAlert: true };
      if (quantity !== null) body.quantity = String(quantity * ratio);
      if (avgCost !== null) body.avgCost = String(avgCost / ratio);
      const res = await fetch(`/api/assets/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '反映に失敗しました');
      toast.success('保有数量・取得単価を分割比率に合わせて更新しました');
      router.refresh();
    } catch (e) {
      toast.error(String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(null);
    }
  }

  async function handleDismiss() {
    setLoading('dismiss');
    try {
      const res = await fetch(`/api/assets/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearSplitAlert: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '処理に失敗しました');
      toast.success('アラートを消去しました（数量・単価は変更していません）');
      router.refresh();
    } catch (e) {
      toast.error(String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(null);
    }
  }

  return (
    <Card className="border-amber-300 bg-amber-50">
      <CardContent className="pt-4 space-y-2">
        <p className="text-sm font-medium text-amber-900">⚠ {message}</p>
        <p className="text-xs text-amber-700">
          保有数量・取得単価は自動では変更していません。「反映する」を押すと数量に比率({ratio}倍)を掛け、取得単価を比率で割った値に更新します。すでに手動で修正済みの場合は「反映せず消去」を選んでください。
        </p>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleApply} disabled={loading !== null || quantity === null}>
            {loading === 'apply' ? '反映中…' : '反映する（数量・単価を自動調整）'}
          </Button>
          <Button size="sm" variant="outline" onClick={handleDismiss} disabled={loading !== null}>
            {loading === 'dismiss' ? '処理中…' : '反映せず消去'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
