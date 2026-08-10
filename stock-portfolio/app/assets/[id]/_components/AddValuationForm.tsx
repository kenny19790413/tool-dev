'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function AddValuationForm({ assetId, currency }: { assetId: number; currency: string }) {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/assets/${assetId}/valuations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value, note: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '登録に失敗しました');
      toast.success('評価額を更新しました');
      setValue('');
      setNote('');
      router.refresh();
    } catch (e) {
      toast.error(String(e instanceof Error ? e.message : e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div>
        <Label htmlFor="value">新しい評価額（{currency === 'USD' ? '米ドル' : '円'}）</Label>
        <Input
          id="value"
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
          className="mt-1 w-40"
        />
      </div>
      <div className="flex-1 min-w-[160px]">
        <Label htmlFor="vnote">メモ（任意）</Label>
        <Input id="vnote" value={note} onChange={(e) => setNote(e.target.value)} className="mt-1" />
      </div>
      <Button type="submit" disabled={saving}>
        {saving ? '登録中…' : '評価額を追加'}
      </Button>
    </form>
  );
}
