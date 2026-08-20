'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ASSET_TYPE_LABEL } from '@/lib/portfolio';

const ASSET_TYPES = ['STOCK', 'BOND', 'FUND', 'PRIVATE'] as const;

export function AllocationTargetForm() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings/allocation-targets')
      .then((res) => res.json())
      .then((data) => {
        const next: Record<string, string> = {};
        for (const t of data.targets ?? []) next[t.assetType] = String(t.targetPercent);
        setValues(next);
      })
      .finally(() => setLoading(false));
  }, []);

  const total = ASSET_TYPES.reduce((sum, t) => sum + (Number(values[t]) || 0), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings/allocation-targets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targets: values }),
      });
      if (!res.ok) throw new Error('保存に失敗しました');
      toast.success('目標配分を保存しました');
    } catch (err) {
      toast.error(String(err instanceof Error ? err.message : err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-gray-400">読み込み中…</p>;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-xs text-gray-500">
        資産クラスごとの目標配分（%）を設定すると、ダッシュボードの「資産クラス別内訳」で現状とのズレを確認できます。空欄の資産クラスは対象外です。
      </p>
      {ASSET_TYPES.map((t) => (
        <div key={t} className="flex items-center gap-3">
          <Label htmlFor={`target-${t}`} className="w-28">
            {ASSET_TYPE_LABEL[t]}
          </Label>
          <Input
            id={`target-${t}`}
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            max="100"
            value={values[t] ?? ''}
            onChange={(e) => setValues((prev) => ({ ...prev, [t]: e.target.value }))}
            className="w-28"
            placeholder="未設定"
          />
          <span className="text-sm text-gray-400">%</span>
        </div>
      ))}
      <p className={`text-xs ${total === 100 || total === 0 ? 'text-gray-400' : 'text-amber-600'}`}>
        合計: {total}%{total !== 100 && total !== 0 && '（100%になるよう調整することをおすすめします）'}
      </p>
      <Button type="submit" size="sm" disabled={saving}>
        {saving ? '保存中…' : '保存'}
      </Button>
    </form>
  );
}
