'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/portfolio';

interface Receipt {
  id: number;
  amount: number;
  receivedAt: string;
  note: string | null;
}

export function DistributionReceiptSection({
  assetId,
  currency,
  receipts,
}: {
  assetId: number;
  currency: string;
  receipts: Receipt[];
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [receivedAt, setReceivedAt] = useState(today);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const yearTotal = receipts
    .filter((r) => new Date(r.receivedAt).getFullYear() === new Date().getFullYear())
    .reduce((sum, r) => sum + r.amount, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/assets/${assetId}/distribution-receipts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, receivedAt, note: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '登録に失敗しました');
      toast.success('受取記録を追加しました');
      setAmount('');
      setNote('');
      setReceivedAt(today);
      router.refresh();
    } catch (err) {
      toast.error(String(err instanceof Error ? err.message : err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(receiptId: number) {
    setDeletingId(receiptId);
    try {
      const res = await fetch(`/api/assets/${assetId}/distribution-receipts/${receiptId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('削除に失敗しました');
      toast.success('削除しました');
      router.refresh();
    } catch (err) {
      toast.error(String(err instanceof Error ? err.message : err));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        今年の受取合計: <span className="font-semibold">{formatCurrency(yearTotal, currency)}</span>
        <span className="text-xs text-gray-400 ml-2">（「年間配当・分配金見込み」は予測値、こちらは実際の入金記録）</span>
      </p>

      {receipts.length > 0 && (
        <ul className="space-y-1 text-sm">
          {receipts.map((r) => (
            <li key={r.id} className="flex items-center justify-between border-b py-1.5">
              <span>
                {new Date(r.receivedAt).toLocaleDateString('ja-JP')} ・ {formatCurrency(r.amount, currency)}
                {r.note && <span className="text-xs text-gray-400 ml-2">{r.note}</span>}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(r.id)}
                disabled={deletingId === r.id}
                className="text-xs text-red-500 hover:underline disabled:opacity-50"
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="receivedAt">受取日</Label>
          <Input
            id="receivedAt"
            type="date"
            value={receivedAt}
            onChange={(e) => setReceivedAt(e.target.value)}
            required
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="amount">受取額（{currency === 'USD' ? '米ドル' : '円'}）</Label>
          <Input
            id="amount"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="mt-1 w-40"
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <Label htmlFor="rnote">メモ（任意）</Label>
          <Input id="rnote" value={note} onChange={(e) => setNote(e.target.value)} className="mt-1" />
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? '登録中…' : '受取記録を追加'}
        </Button>
      </form>
    </div>
  );
}
