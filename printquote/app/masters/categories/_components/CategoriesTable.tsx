'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface CatRow { id: number; name: string; sort_order: number; }

export function CategoriesTable({ initial }: { initial: CatRow[] }) {
  const [rows, setRows] = useState<CatRow[]>(initial);
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<CatRow>>({});

  const reload = async () => {
    const r = await fetch('/api/masters/categories');
    if (r.ok) setRows(await r.json());
  };

  const add = async () => {
    if (!name) { toast.error('名称を入力してください'); return; }
    const r = await fetch('/api/masters/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, sortOrder: Number(sortOrder) }),
    });
    if (!r.ok) { toast.error('登録失敗'); return; }
    toast.success('登録しました');
    setName(''); setSortOrder('0');
    await reload();
  };

  const save = async (id: number) => {
    await fetch(`/api/masters/categories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editForm.name, sortOrder: Number(editForm.sort_order ?? 0) }),
    });
    toast.success('更新しました');
    setEditId(null);
    await reload();
  };

  const remove = async (id: number) => {
    await fetch(`/api/masters/categories/${id}`, { method: 'DELETE' });
    setRows(rows.filter(r => r.id !== id));
    toast.success('削除しました');
  };

  return (
    <div className="space-y-6">
      <div className="border rounded-lg p-4 bg-white space-y-3">
        <p className="text-sm font-semibold">新規登録</p>
        <div className="flex gap-3 items-end">
          <div><label className="text-xs text-gray-500 block mb-1">品種名</label><Input value={name} onChange={e => setName(e.target.value)} placeholder="例: チラシ" className="w-40" /></div>
          <div><label className="text-xs text-gray-500 block mb-1">並び順</label><Input type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="w-20" /></div>
          <Button onClick={add}>追加</Button>
        </div>
      </div>
      <div className="border rounded-lg overflow-hidden max-w-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 text-xs">
              <TableHead>品種名</TableHead><TableHead className="text-right">並び順</TableHead><TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.id} className="text-sm">
                {editId === r.id ? (
                  <>
                    <TableCell><Input value={editForm.name ?? ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="h-7 w-32" /></TableCell>
                    <TableCell><Input type="number" value={editForm.sort_order ?? 0} onChange={e => setEditForm(f => ({ ...f, sort_order: Number(e.target.value) }))} className="h-7 w-16" /></TableCell>
                    <TableCell className="flex gap-1"><Button size="sm" className="h-7 px-2 text-xs" onClick={() => save(r.id)}>保存</Button><Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditId(null)}>取消</Button></TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="font-medium">{r.name}</TableCell>
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
