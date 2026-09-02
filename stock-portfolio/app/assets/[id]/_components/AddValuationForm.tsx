'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function AddValuationForm({
  assetId,
  currency,
  hasValuationUrl,
}: {
  assetId: number;
  currency: string;
  hasValuationUrl?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchedHint, setFetchedHint] = useState<string | null>(null);

  async function handleAutoFetch() {
    setFetching(true);
    setFetchedHint(null);
    try {
      const res = await fetch(`/api/assets/${assetId}/fetch-valuation`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '取得に失敗しました');
      setValue(String(data.value));
      setNote(
        `自動取得（${data.matchedKeyword}${data.asOfDate ? `、${data.asOfDate}時点` : ''}）※内容を確認してから登録してください`
      );
      setFetchedHint(
        `ページからは「${data.matchedKeyword}」として ${Number(data.value).toLocaleString('ja-JP')} という金額が読み取れました。` +
          'この数字が「1万口あたりの基準価額」等の単価である場合、そのまま登録すると評価額を大きく取り違えます。保有口数・保有量を掛けた実際の評価額に修正してから登録してください。'
      );
      toast.success('ページから金額を読み取りました。単価か総額かを確認してから登録してください');
    } catch (e) {
      toast.error(String(e instanceof Error ? e.message : e));
    } finally {
      setFetching(false);
    }
  }

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
      {hasValuationUrl && (
        <div className="w-full space-y-2">
          <Button type="button" variant="outline" size="sm" onClick={handleAutoFetch} disabled={fetching}>
            {fetching ? '取得中…' : 'ページから自動取得を試す'}
          </Button>
          {fetchedHint && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              ⚠ {fetchedHint}
            </p>
          )}
        </div>
      )}
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
