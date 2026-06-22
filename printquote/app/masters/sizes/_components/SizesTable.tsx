'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface SizeRow { id: number; name: string; width_mm: number; height_mm: number; note: string | null; sort_order: number; }

export function SizesTable({ initial }: { initial: SizeRow[] }) {
  const [rows, setRows] = useState<SizeRow[]>(initial);
  const [form, setForm] = useState({ name: '', widthMm: '', heightMm: '', note: '', sortOrder: '0' });
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<SizeRow>>({});

  const reload = async () => {
    const r = await fetch('/api/masters/sizes');
    if (r.ok) setRows(await r.json());
  };

  const add = async () => {
    if (!form.name || !form.widthMm || !form.heightMm) { toast.error('名称・幅・高さは必須です'); return; }
    const r = await fetch('/api/masters/sizes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, widthMm: Number(form.widthMm), heightMm: Number(form.heightMm), note: form.note || null, sortOrder: Number(form.sortOrder) }),
    });
    if (!r.ok) { toast.error('登録失敗'); return; }
    toast.success('登録しました');
    setForm({ name: '', widthMm: '', heightMm: '', note: '', sortOrder: '0' });
    await reload();
  };

  const save = async (id: number) => {
    await fetch(`/api/masters/sizes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editForm.name, widthMm: Number(editForm.width_mm), heightMm: Number(editForm.height_mm), note: editForm.note ?? null, sortOrder: Number(editForm.sort_order ?? 0) }),
    });
    toast.success('更新しました');
    setEditId(null);
    await reload();
  };

  const remove = async (id: number) => {
    await fetch(`/api/masters/sizes/${id}`, { method: 'DELETE' });
    setRows(rows.filter(r => r.id !== id));
    toast.success('削除しました');
  };

  return (
    <div className="space-y-6">
      <div className="border rounded-lg p-4 bg-white space-y-3">
        <p className="text-sm font-semibold">新規登録</p>
        <div className="flex flex-wrap gap-3 items-end">
          <div><label className="text-xs text-gray-500 block mb-1">名称</label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="例: A4" className="w-28" /></div>
          <div><label className="text-xs text-gray-500 block mb-1">幅 mm</label><Input type="number" value={form.widthMm} onChange={e => setForm(f => ({ ...f, widthMm: e.target.value }))} className="w-24" /></div>
          <div><label className="text-xs text-gray-500 block mb-1">高さ mm</label><Input type="number" value={form.heightMm} onChange={e => setForm(f => ({ ...f, heightMm: e.target.value }))} className="w-24" /></div>
          <div><label className="text-xs text-gray-500 block mb-1">備考</label><Input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className="w-36" /></div>
          <div><label className="text-xs text-gray-500 block mb-1">並び順</label><Input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))} className="w-20" /></div>
          <Button onClick={add}>追加</Button>
        </div>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 text-xs">
              <TableHead>名称</TableHead><TableHead className="text-right">幅 mm</TableHead><TableHead className="text-right">高さ mm</TableHead><TableHead>備考</TableHead><TableHead className="text-right w-16">並び順</TableHead><TableHead className="w-28"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.id} className="text-sm">
                {editId === r.id ? (
                  <>
                    <TableCell><Input value={editForm.name ?? ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="h-7 w-24" /></TableCell>
                    <TableCell><Input type="number" value={editForm.width_mm ?? ''} onChange={e => setEditForm(f => ({ ...f, width_mm: Number(e.target.value) }))} className="h-7 w-20" /></TableCell>
                    <TableCell><Input type="number" value={editForm.height_mm ?? ''} onChange={e => setEditForm(f => ({ ...f, height_mm: Number(e.target.value) }))} className="h-7 w-20" /></TableCell>
                    <TableCell><Input value={editForm.note ?? ''} onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))} className="h-7" /></TableCell>
                    <TableCell><Input type="number" value={editForm.sort_order ?? 0} onChange={e => setEditForm(f => ({ ...f, sort_order: Number(e.target.value) }))} className="h-7 w-16" /></TableCell>
                    <TableCell className="flex gap-1"><Button size="sm" className="h-7 px-2 text-xs" onClick={() => save(r.id)}>保存</Button><Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditId(null)}>取消</Button></TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-right">{Number(r.width_mm)}</TableCell>
                    <TableCell className="text-right">{Number(r.height_mm)}</TableCell>
                    <TableCell className="text-gray-400">{r.note ?? ''}</TableCell>
                    <TableCell className="text-right text-gray-400">{r.sort_order}</TableCell>
                    <TableCell className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setEditId(r.id); setEditForm(r); }}>編集</Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-red-500" onClick={() => remove(r.id)}>削除</Button>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
