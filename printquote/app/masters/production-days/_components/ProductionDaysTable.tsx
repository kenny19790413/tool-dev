'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

interface Row {
  id: number;
  process_type: string;
  quantity_min: number;
  quantity_max: number | null;
  days: number;
  note: string | null;
}

interface Props {
  initial: Row[];
  processLabels: Record<string, string>;
}

const PROCESS_TYPES = [
  'print','cutting','pp','press','emboss','foil',
  'lamination','corrugated','thomson','binding','packing',
];

export function ProductionDaysTable({ initial, processLabels }: Props) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Row>>({});
  const [adding, setAdding] = useState(false);
  const [newForm, setNewForm] = useState({ process_type: 'print', quantity_min: 0, quantity_max: '', days: 1, note: '' });

  async function save(id: number) {
    const res = await fetch(`/api/masters/production-days/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        processType: editForm.process_type,
        quantityMin: editForm.quantity_min,
        quantityMax: editForm.quantity_max ?? null,
        days: editForm.days,
        note: editForm.note || null,
      }),
    });
    if (!res.ok) { toast.error('更新失敗'); return; }
    const updated = await res.json();
    setRows((r) => r.map((row) => (row.id === id ? updated : row)));
    setEditId(null);
    toast.success('更新しました');
  }

  async function remove(id: number) {
    if (!confirm('削除しますか？')) return;
    await fetch(`/api/masters/production-days/${id}`, { method: 'DELETE' });
    setRows((r) => r.filter((row) => row.id !== id));
    toast.success('削除しました');
  }

  async function add() {
    const res = await fetch('/api/masters/production-days', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        processType: newForm.process_type,
        quantityMin: Number(newForm.quantity_min),
        quantityMax: newForm.quantity_max ? Number(newForm.quantity_max) : null,
        days: Number(newForm.days),
        note: newForm.note || null,
      }),
    });
    if (!res.ok) { toast.error('追加失敗'); return; }
    const row = await res.json();
    setRows((r) => [...r, row].sort((a, b) => a.process_type.localeCompare(b.process_type) || a.quantity_min - b.quantity_min));
    setAdding(false);
    setNewForm({ process_type: 'print', quantity_min: 0, quantity_max: '', days: 1, note: '' });
    toast.success('追加しました');
  }

  const selectClass = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setAdding(true)}>＋ 追加</Button>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 text-xs">
              <TableHead>工程</TableHead>
              <TableHead>数量下限</TableHead>
              <TableHead>数量上限</TableHead>
              <TableHead className="text-center">標準日数</TableHead>
              <TableHead>備考</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {adding && (
              <TableRow className="bg-blue-50">
                <TableCell>
                  <select
                    className={selectClass}
                    value={newForm.process_type}
                    onChange={(e) => setNewForm((f) => ({ ...f, process_type: e.target.value }))}
                  >
                    {PROCESS_TYPES.map((pt) => (
                      <option key={pt} value={pt}>{processLabels[pt] ?? pt}</option>
                    ))}
                  </select>
                </TableCell>
                <TableCell>
                  <Input type="number" value={newForm.quantity_min} onChange={(e) => setNewForm((f) => ({ ...f, quantity_min: Number(e.target.value) }))} className="h-8 text-sm" />
                </TableCell>
                <TableCell>
                  <Input type="number" placeholder="上限なし" value={newForm.quantity_max} onChange={(e) => setNewForm((f) => ({ ...f, quantity_max: e.target.value }))} className="h-8 text-sm" />
                </TableCell>
                <TableCell>
                  <Input type="number" min={1} value={newForm.days} onChange={(e) => setNewForm((f) => ({ ...f, days: Number(e.target.value) }))} className="h-8 text-sm text-center" />
                </TableCell>
                <TableCell>
                  <Input value={newForm.note} onChange={(e) => setNewForm((f) => ({ ...f, note: e.target.value }))} className="h-8 text-sm" />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" onClick={add}>保存</Button>
                    <Button size="sm" variant="outline" onClick={() => setAdding(false)}>✕</Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) =>
              editId === row.id ? (
                <TableRow key={row.id} className="bg-yellow-50">
                  <TableCell>
                    <select
                      className={selectClass}
                      value={editForm.process_type}
                      onChange={(e) => setEditForm((f) => ({ ...f, process_type: e.target.value }))}
                    >
                      {PROCESS_TYPES.map((pt) => (
                        <option key={pt} value={pt}>{processLabels[pt] ?? pt}</option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell><Input type="number" value={editForm.quantity_min} onChange={(e) => setEditForm((f) => ({ ...f, quantity_min: Number(e.target.value) }))} className="h-8 text-sm" /></TableCell>
                  <TableCell><Input type="number" placeholder="上限なし" value={editForm.quantity_max ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, quantity_max: e.target.value ? Number(e.target.value) : null }))} className="h-8 text-sm" /></TableCell>
                  <TableCell><Input type="number" min={1} value={editForm.days} onChange={(e) => setEditForm((f) => ({ ...f, days: Number(e.target.value) }))} className="h-8 text-sm text-center" /></TableCell>
                  <TableCell><Input value={editForm.note ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, note: e.target.value }))} className="h-8 text-sm" /></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => save(row.id)}>保存</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditId(null)}>✕</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow key={row.id} className="hover:bg-gray-50 text-sm">
                  <TableCell className="font-medium">{processLabels[row.process_type] ?? row.process_type}</TableCell>
                  <TableCell>{row.quantity_min.toLocaleString()}部〜</TableCell>
                  <TableCell>{row.quantity_max != null ? `${row.quantity_max.toLocaleString()}部` : '上限なし'}</TableCell>
                  <TableCell className="text-center font-bold text-blue-700">{row.days}日</TableCell>
                  <TableCell className="text-gray-500">{row.note ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => { setEditId(row.id); setEditForm(row); }}>編集</Button>
                      <Button size="sm" variant="destructive" onClick={() => remove(row.id)}>削除</Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
