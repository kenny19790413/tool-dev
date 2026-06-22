'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface RecalcButtonProps {
  estimateId: number;
  itemId: number;
  defaultQuantities: number[];
}

export function RecalcButton({ estimateId, itemId, defaultQuantities }: RecalcButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quantitiesStr, setQuantitiesStr] = useState(defaultQuantities.join(', '));

  const handleRecalc = async () => {
    const quantities = quantitiesStr
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0);

    if (quantities.length === 0) {
      toast.error('有効な数量を入力してください');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/estimates/${estimateId}/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, quantities }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? '計算失敗');
      }
      toast.success('再計算しました');
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="text-xs"
        onClick={() => setOpen(true)}
      >
        数量を変えて再計算
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        className="h-8 text-xs w-64"
        placeholder="例: 1000, 3000, 5000"
        value={quantitiesStr}
        onChange={(e) => setQuantitiesStr(e.target.value)}
      />
      <Button size="sm" className="text-xs" onClick={handleRecalc} disabled={loading}>
        {loading ? '計算中...' : '実行'}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="text-xs"
        onClick={() => setOpen(false)}
        disabled={loading}
      >
        閉じる
      </Button>
    </div>
  );
}
