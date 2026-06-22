'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

interface Holiday {
  id: number;
  date: string;
  name: string;
  type: 'public' | 'company';
}

export function HolidaysTable({ initial }: { initial: Holiday[] }) {
  const [rows, setRows] = useState<Holiday[]>(initial);
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<'public' | 'company'>('public');
  const [loading, setLoading] = useState(false);

  const add = async () => {
    if (!date || !name) { toast.error('日付と名称を入力してください'); return; }
    setLoading(true);
    const res = await fetch('/api/masters/holidays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, name, type }),
    });
    setLoading(false);
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error ?? '登録失敗');
      return;
    }
    const row = await res.json();
    setRows((prev) => [...prev, row].sort((a, b) => a.date.localeCompare(b.date)));
    setDate(''); setName(''); setType('public');
    toast.success('登録しました');
  };

  const remove = async (id: number) => {
    await fetch(`/api/masters/holidays/${id}`, { method: 'DELETE' });
    setRows((prev) => prev.filter((r) => r.id !== id));
    toast.success('削除しました');
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });

  return (
    <div className="space-y-6">
      {/* 追加フォーム */}
      <div className="border rounded-lg p-4 bg-white space-y-3">
        <p className="text-sm font-semibold text-gray-700">新規登録</p>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-gray-500 block mb-1">日付</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">名称</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="例: 元日" className="w-48" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">種別</label>
            <div className="flex gap-4 items-center h-9">
              {(['public', 'company'] as const).map((t) => (
                <label key={t} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input type="radio" name="type" value={t} checked={type === t} onChange={() => setType(t)} />
                  {t === 'public' ? '祝日' : '休業日'}
                </label>
              ))}
            </div>
          </div>
          <Button onClick={add} disabled={loading}>追加</Button>
        </div>
      </div>

      {/* 一覧テーブル */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 text-xs">
              <TableHead>日付</TableHead>
              <TableHead>名称</TableHead>
              <TableHead>種別</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-gray-400 py-8">
                  登録なし
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id} className="text-sm">
                  <TableCell>{fmtDate(r.date)}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      r.type === 'public' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {r.type === 'public' ? '祝日' : '休業日'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700 h-7 px-2"
                      onClick={() => remove(r.id)}
                    >
                      削除
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
