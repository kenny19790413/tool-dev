'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Processing {
  id: number;
  process_type: string;
  product_type: string | null;
  threshold: number;
  fixed_price: number;
  coeff_a: number | null;
  coeff_b: number | null;
  per_sheet_price: number | null;
  note: string | null;
}

const PROCESS_LABEL: Record<string, string> = {
  cutting: '断裁', pp: 'PP加工', press: 'プレス', emboss: 'エンボス',
  foil: '箔押し', lamination: '合紙', corrugated: '片段', thomson: 'トムソン',
  packing: '梱包', binding: '製本', delivery: '納品', other: 'その他',
};

interface EditDialogProps {
  row: Processing;
  onDone: () => void;
}

function EditDialog({ row, onDone }: EditDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = {
      threshold: Number(fd.get('threshold')),
      fixedPrice: Number(fd.get('fixedPrice')),
      coeffA: fd.get('coeffA') ? Number(fd.get('coeffA')) : null,
      coeffB: fd.get('coeffB') ? Number(fd.get('coeffB')) : null,
      perSheetPrice: fd.get('perSheetPrice') ? Number(fd.get('perSheetPrice')) : null,
      note: fd.get('note') || null,
    };
    setSaving(true);
    try {
      const res = await fetch(`/api/masters/processings/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('更新しました');
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
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-xs h-7 px-2">編集</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {PROCESS_LABEL[row.process_type] ?? row.process_type}
            {row.product_type ? `（${row.product_type === 'thick' ? '厚物' : '薄物'}）` : ''}
            を編集
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <div>
            <Label>閾値（通し数）</Label>
            <Input name="threshold" type="number" defaultValue={row.threshold} required />
          </div>
          <div>
            <Label>固定費（円）</Label>
            <Input name="fixedPrice" type="number" step="0.01" defaultValue={Number(row.fixed_price)} required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>係数A</Label>
              <Input name="coeffA" type="number" step="0.000001" defaultValue={row.coeff_a ?? ''} />
            </div>
            <div>
              <Label>係数B</Label>
              <Input name="coeffB" type="number" step="0.0001" defaultValue={row.coeff_b ?? ''} />
            </div>
          </div>
          <div>
            <Label>通し単価（円）</Label>
            <Input name="perSheetPrice" type="number" step="0.0001" defaultValue={row.per_sheet_price ?? ''} />
          </div>
          <div>
            <Label>備考</Label>
            <Input name="note" defaultValue={row.note ?? ''} />
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

export function ProcessingsTable({ initial }: { initial: Processing[] }) {
  const [rows, setRows] = useState<Processing[]>(initial);

  const reload = useCallback(async () => {
    const res = await fetch('/api/masters/processings');
    if (res.ok) setRows(await res.json());
  }, []);

  const fmt = (n: number | null) => n != null ? Number(n).toLocaleString() : '—';

  return (
    <div className="rounded-lg border bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50 text-xs">
            <TableHead>加工種別</TableHead>
            <TableHead>対象製品</TableHead>
            <TableHead className="text-right">閾値</TableHead>
            <TableHead className="text-right">固定費</TableHead>
            <TableHead className="text-right">係数A</TableHead>
            <TableHead className="text-right">係数B</TableHead>
            <TableHead className="text-right">通し単価</TableHead>
            <TableHead>備考</TableHead>
            <TableHead className="w-16"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium text-sm">
                {PROCESS_LABEL[r.process_type] ?? r.process_type}
              </TableCell>
              <TableCell className="text-sm text-gray-500">
                {r.product_type === 'thick' ? '厚物' : r.product_type === 'thin' ? '薄物' : '共通'}
              </TableCell>
              <TableCell className="text-right text-sm">{fmt(r.threshold)}</TableCell>
              <TableCell className="text-right text-sm">¥{fmt(r.fixed_price)}</TableCell>
              <TableCell className="text-right text-sm font-mono text-xs">{fmt(r.coeff_a)}</TableCell>
              <TableCell className="text-right text-sm font-mono text-xs">{fmt(r.coeff_b)}</TableCell>
              <TableCell className="text-right text-sm">{r.per_sheet_price != null ? `¥${r.per_sheet_price}` : '—'}</TableCell>
              <TableCell className="text-sm text-gray-400 max-w-[120px] truncate">{r.note ?? ''}</TableCell>
              <TableCell>
                <EditDialog row={r} onDone={reload} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
