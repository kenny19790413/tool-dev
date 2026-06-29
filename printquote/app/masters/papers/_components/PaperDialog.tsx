'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

type PriceMode = 'kg' | 'sheet';

// 四六全判→菊全判の連量換算係数
const KIKU_RATIO = (636 * 939) / (788 * 1091);

interface Paper {
  id: number;
  number: number;
  name: string;
  parent_size: string;
  width_mm: number;
  height_mm: number;
  ream_weight: number | null;
  unit_price: number | null;
  sheet_price: number | null;
  low_vol_price: number | null;
  rate: number;
  supplier: string | null;
  note: string | null;
  is_active: boolean;
}

interface Props {
  paper?: Paper;
  trigger: React.ReactNode;
  onDone: () => void;
}

export function PaperDialog({ paper, trigger, onDone }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [priceMode, setPriceMode] = useState<PriceMode>(
    paper?.sheet_price != null ? 'sheet' : 'kg'
  );
  const [reamWeight, setReamWeight] = useState<string>(
    paper?.ream_weight != null ? String(paper.ream_weight) : ''
  );

  const kikuWeight = reamWeight ? (parseFloat(reamWeight) * KIKU_RATIO).toFixed(1) : null;

  const isEdit = !!paper;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = {
      number: Number(fd.get('number')),
      name: fd.get('name'),
      parentSize: fd.get('parentSize'),
      widthMm: Number(fd.get('widthMm')),
      heightMm: Number(fd.get('heightMm')),
      reamWeight: fd.get('reamWeight') ? Number(fd.get('reamWeight')) : null,
      unitPrice: priceMode === 'kg' && fd.get('unitPrice') ? Number(fd.get('unitPrice')) : null,
      sheetPrice: priceMode === 'sheet' && fd.get('sheetPrice') ? Number(fd.get('sheetPrice')) : null,
      lowVolPrice: fd.get('lowVolPrice') ? Number(fd.get('lowVolPrice')) : null,
      rate: Number(fd.get('rate') || 100),
      supplier: fd.get('supplier') || null,
      note: fd.get('note') || null,
    };
    setSaving(true);
    try {
      const url = isEdit ? `/api/masters/papers/${paper.id}` : '/api/masters/papers';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(isEdit ? '用紙を更新しました' : '用紙を追加しました');
      setOpen(false);
      onDone();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? '用紙を編集' : '用紙を追加'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>品番 *</Label>
              <Input name="number" type="number" defaultValue={paper?.number} required />
            </div>
            <div>
              <Label>親判サイズ</Label>
              <Input name="parentSize" defaultValue={paper?.parent_size ?? '四六全判'} />
            </div>
          </div>
          <div>
            <Label>用紙名 *</Label>
            <Input name="name" defaultValue={paper?.name} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>幅 mm *</Label>
              <Input name="widthMm" type="number" step="0.1" defaultValue={paper?.width_mm ?? 788} required />
            </div>
            <div>
              <Label>高さ mm *</Label>
              <Input name="heightMm" type="number" step="0.1" defaultValue={paper?.height_mm ?? 1091} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>レート %</Label>
              <Input name="rate" type="number" step="0.01" defaultValue={paper?.rate ?? 100} />
            </div>
          </div>
          {/* 単価方式ラジオ */}
          <div>
            <Label>単価方式 *</Label>
            <div className="flex gap-6 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="priceMode"
                  value="kg"
                  checked={priceMode === 'kg'}
                  onChange={() => setPriceMode('kg')}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-sm font-medium">㎏単価</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="priceMode"
                  value="sheet"
                  checked={priceMode === 'sheet'}
                  onChange={() => setPriceMode('sheet')}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-sm font-medium">枚単価</span>
              </label>
            </div>
          </div>

          {/* 選択した方式の入力欄のみ表示 */}
          {priceMode === 'kg' ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>㎏単価（円/kg）</Label>
                  <Input name="unitPrice" type="number" step="0.01" defaultValue={paper?.unit_price ?? ''} />
                </div>
                <div>
                  <Label>連量 kg（四六全判基準）</Label>
                  <Input
                    name="reamWeight"
                    type="number"
                    step="0.01"
                    value={reamWeight}
                    onChange={e => setReamWeight(e.target.value)}
                  />
                </div>
              </div>
              {kikuWeight && (
                <p className="text-xs text-gray-500 bg-gray-50 rounded px-3 py-1.5">
                  菊全判換算：<span className="font-semibold text-gray-700">{kikuWeight} kg</span>
                  <span className="ml-2 text-gray-400">（四六全判 × 0.695）</span>
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>枚単価（円/枚）</Label>
                <Input name="sheetPrice" type="number" step="0.0001" defaultValue={paper?.sheet_price ?? ''} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>少量割増単価</Label>
              <Input name="lowVolPrice" type="number" step="0.01" defaultValue={paper?.low_vol_price ?? ''} />
            </div>
          </div>
          <div>
            <Label>仕入先</Label>
            <Input name="supplier" defaultValue={paper?.supplier ?? ''} />
          </div>
          <div>
            <Label>備考</Label>
            <Input name="note" defaultValue={paper?.note ?? ''} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>キャンセル</Button>
            <Button type="submit" disabled={saving}>{saving ? '保存中…' : '保存'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
