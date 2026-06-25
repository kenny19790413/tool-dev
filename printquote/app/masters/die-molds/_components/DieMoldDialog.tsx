'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

type MoldType = 'thomson' | 'foil' | 'emboss' | 'other';

interface Customer {
  id: number;
  name: string;
}

interface DieMold {
  id: number;
  mold_code: string;
  mold_type: MoldType;
  width_mm: number;
  height_mm: number;
  faces: number;
  complexity: number;
  base_mold_cost: number | null;
  customer_id: number | null;
  customer_name: string | null;
  storage_location: string | null;
  manufactured_at: string | null;
  note: string | null;
  is_active: boolean;
}

interface Props {
  dieMold?: DieMold;
  customers: Customer[];
  trigger: React.ReactNode;
  onDone: () => void;
}

const MOLD_TYPE_LABELS: Record<MoldType, string> = {
  thomson: 'トムソン',
  foil: '箔押し',
  emboss: 'エンボス',
  other: 'その他',
};

const COMPLEXITY_LABELS: Record<number, string> = {
  1: '1 = シンプル',
  2: '2 = 普通',
  3: '3 = 複雑',
};

export function DieMoldDialog({ dieMold, customers, trigger, onDone }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const isEdit = !!dieMold;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const customerIdVal = fd.get('customerId') as string;
    const manufacturedAtVal = fd.get('manufacturedAt') as string;

    const body = {
      moldCode: fd.get('moldCode'),
      moldType: fd.get('moldType'),
      widthMm: Number(fd.get('widthMm')),
      heightMm: Number(fd.get('heightMm')),
      faces: Number(fd.get('faces') || 1),
      complexity: Number(fd.get('complexity') || 1),
      baseMoldCost: fd.get('baseMoldCost') ? Number(fd.get('baseMoldCost')) : null,
      customerId: customerIdVal ? Number(customerIdVal) : null,
      storageLocation: fd.get('storageLocation') || null,
      manufacturedAt: manufacturedAtVal || null,
      note: fd.get('note') || null,
    };

    setSaving(true);
    try {
      const url = isEdit ? `/api/masters/die-molds/${dieMold.id}` : '/api/masters/die-molds';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(isEdit ? '型台を更新しました' : '型台を追加しました');
      setOpen(false);
      onDone();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSaving(false);
    }
  }

  // manufactured_at は ISO 文字列 or Date → YYYY-MM-DD に変換
  const manufacturedAtDefault = dieMold?.manufactured_at
    ? dieMold.manufactured_at.slice(0, 10)
    : '';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? '型台を編集' : '型台を追加'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          {/* 型台コード */}
          <div>
            <Label>型台コード *</Label>
            <Input
              name="moldCode"
              placeholder="例: T-001"
              defaultValue={dieMold?.mold_code}
              required
            />
          </div>

          {/* 種別 */}
          <div>
            <Label>種別 *</Label>
            <select
              name="moldType"
              defaultValue={dieMold?.mold_type ?? 'thomson'}
              required
              className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {(Object.entries(MOLD_TYPE_LABELS) as [MoldType, string][]).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* サイズ */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>仕上サイズ 幅 mm *</Label>
              <Input
                name="widthMm"
                type="number"
                step="0.1"
                min="0"
                defaultValue={dieMold?.width_mm}
                required
              />
            </div>
            <div>
              <Label>仕上サイズ 高さ mm *</Label>
              <Input
                name="heightMm"
                type="number"
                step="0.1"
                min="0"
                defaultValue={dieMold?.height_mm}
                required
              />
            </div>
          </div>

          {/* 面付け・複雑度 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>面付け数</Label>
              <Input
                name="faces"
                type="number"
                min="1"
                step="1"
                defaultValue={dieMold?.faces ?? 1}
              />
            </div>
            <div>
              <Label>複雑度</Label>
              <select
                name="complexity"
                defaultValue={dieMold?.complexity ?? 1}
                className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(COMPLEXITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 基本型代 */}
          <div>
            <Label>基本型代（円）</Label>
            <Input
              name="baseMoldCost"
              type="number"
              step="1"
              min="0"
              defaultValue={dieMold?.base_mold_cost ?? ''}
              placeholder="任意"
            />
          </div>

          {/* 顧客専用 */}
          <div>
            <Label>顧客専用</Label>
            <select
              name="customerId"
              defaultValue={dieMold?.customer_id ?? ''}
              className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">共通型</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* 保管場所 */}
          <div>
            <Label>保管場所</Label>
            <Input
              name="storageLocation"
              defaultValue={dieMold?.storage_location ?? ''}
              placeholder="例: 棚A-3"
            />
          </div>

          {/* 製作日 */}
          <div>
            <Label>製作日</Label>
            <Input
              name="manufacturedAt"
              type="date"
              defaultValue={manufacturedAtDefault}
            />
          </div>

          {/* 備考 */}
          <div>
            <Label>備考</Label>
            <Input
              name="note"
              defaultValue={dieMold?.note ?? ''}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              キャンセル
            </Button>
            <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? '保存中…' : '保存'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
