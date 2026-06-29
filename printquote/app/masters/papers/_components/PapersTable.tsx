'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { PaperDialog } from './PaperDialog';

interface Paper {
  id: number;
  number: number;
  name: string;
  parent_size: string;
  width_mm: number;
  height_mm: number;
  ream_weight: number | null;
  unit_price: number;
  low_vol_price: number | null;
  rate: number;
  supplier: string | null;
  note: string | null;
  is_active: boolean;
}

interface Props {
  initial: Paper[];
}

export function PapersTable({ initial }: Props) {
  const [papers, setPapers] = useState<Paper[]>(initial);

  const reload = useCallback(async () => {
    const res = await fetch('/api/masters/papers');
    if (res.ok) setPapers(await res.json());
  }, []);

  async function handleDelete(id: number, name: string) {
    if (!confirm(`「${name}」を無効化しますか？`)) return;
    const res = await fetch(`/api/masters/papers/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('無効化しました');
      reload();
    } else {
      toast.error('削除に失敗しました');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <PaperDialog
          trigger={<Button>＋ 用紙を追加</Button>}
          onDone={reload}
        />
      </div>
      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 text-xs">
              <TableHead className="w-12">品番</TableHead>
              <TableHead>用紙名</TableHead>
              <TableHead>親判</TableHead>
              <TableHead className="text-right">幅mm</TableHead>
              <TableHead className="text-right">高mm</TableHead>
              <TableHead className="text-right">連量(四六全)</TableHead>
              <TableHead className="text-right">㎏単価</TableHead>
              <TableHead className="text-right">少量単価</TableHead>
              <TableHead className="w-16 text-center">状態</TableHead>
              <TableHead className="w-28"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {papers.map((p) => (
              <TableRow key={p.id} className={!p.is_active ? 'opacity-40' : ''}>
                <TableCell className="font-mono text-xs">{p.number}</TableCell>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-sm text-gray-500">{p.parent_size}</TableCell>
                <TableCell className="text-right text-sm">{Number(p.width_mm).toFixed(0)}</TableCell>
                <TableCell className="text-right text-sm">{Number(p.height_mm).toFixed(0)}</TableCell>
                <TableCell className="text-right text-sm">{p.ream_weight ?? '—'}</TableCell>
                <TableCell className="text-right text-sm">¥{Number(p.unit_price).toFixed(2)}</TableCell>
                <TableCell className="text-right text-sm">
                  {p.low_vol_price != null ? `¥${Number(p.low_vol_price).toFixed(2)}` : '—'}
                </TableCell>
                <TableCell className="text-center">
                  {p.is_active
                    ? <Badge variant="outline" className="text-xs text-green-700 border-green-300">有効</Badge>
                    : <Badge variant="outline" className="text-xs text-gray-400">無効</Badge>}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-end">
                    <PaperDialog
                      paper={p}
                      trigger={<Button size="sm" variant="ghost" className="text-xs h-7 px-2">編集</Button>}
                      onDone={reload}
                    />
                    {p.is_active && (
                      <Button
                        size="sm" variant="ghost"
                        className="text-xs h-7 px-2 text-red-500 hover:text-red-700"
                        onClick={() => handleDelete(p.id, p.name)}
                      >
                        無効化
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
