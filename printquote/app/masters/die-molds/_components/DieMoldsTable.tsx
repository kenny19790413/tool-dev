'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { DieMoldDialog } from './DieMoldDialog';

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
  initial: DieMold[];
  customers: Customer[];
}

const MOLD_TYPE_LABELS: Record<MoldType, string> = {
  thomson: 'トムソン',
  foil: '箔押し',
  emboss: 'エンボス',
  other: 'その他',
};

const COMPLEXITY_LABELS: Record<number, string> = {
  1: 'シンプル',
  2: '普通',
  3: '複雑',
};

const MOLD_TYPE_BADGE_COLOR: Record<MoldType, string> = {
  thomson: 'border-blue-300 text-blue-700',
  foil: 'border-yellow-300 text-yellow-700',
  emboss: 'border-purple-300 text-purple-700',
  other: 'border-gray-300 text-gray-600',
};

export function DieMoldsTable({ initial, customers }: Props) {
  const [dieMolds, setDieMolds] = useState<DieMold[]>(initial);

  const reload = useCallback(async () => {
    const res = await fetch('/api/masters/die-molds');
    if (res.ok) setDieMolds(await res.json());
  }, []);

  async function handleToggleActive(id: number, currentActive: boolean, moldCode: string) {
    const action = currentActive ? '無効化' : '有効化';
    if (!confirm(`「${moldCode}」を${action}しますか？`)) return;

    const res = await fetch(`/api/masters/die-molds/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !currentActive }),
    });
    if (res.ok) {
      toast.success(`${action}しました`);
      reload();
    } else {
      toast.error(`${action}に失敗しました`);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <DieMoldDialog
          customers={customers}
          trigger={
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              ＋ 型台を追加
            </Button>
          }
          onDone={reload}
        />
      </div>
      <div className="rounded-lg border bg-white overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 text-xs">
              <TableHead>型台コード</TableHead>
              <TableHead>種別</TableHead>
              <TableHead className="text-right">サイズ（幅×高さ）</TableHead>
              <TableHead className="text-right">面付</TableHead>
              <TableHead>複雑度</TableHead>
              <TableHead className="text-right">基本型代</TableHead>
              <TableHead>顧客専用</TableHead>
              <TableHead>保管場所</TableHead>
              <TableHead className="w-16 text-center">状態</TableHead>
              <TableHead className="w-32"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dieMolds.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-gray-400 py-8 text-sm">
                  型台が登録されていません
                </TableCell>
              </TableRow>
            )}
            {dieMolds.map((dm) => (
              <TableRow key={dm.id} className={!dm.is_active ? 'opacity-40' : ''}>
                <TableCell className="font-mono text-sm font-medium">{dm.mold_code}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`text-xs ${MOLD_TYPE_BADGE_COLOR[dm.mold_type]}`}
                  >
                    {MOLD_TYPE_LABELS[dm.mold_type]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-sm">
                  {Number(dm.width_mm).toFixed(1)} × {Number(dm.height_mm).toFixed(1)}
                </TableCell>
                <TableCell className="text-right text-sm">{dm.faces}</TableCell>
                <TableCell className="text-sm text-gray-600">
                  {COMPLEXITY_LABELS[dm.complexity] ?? dm.complexity}
                </TableCell>
                <TableCell className="text-right text-sm">
                  {dm.base_mold_cost != null
                    ? `¥${Number(dm.base_mold_cost).toLocaleString()}`
                    : '—'}
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  {dm.customer_name ?? (
                    <span className="text-gray-400">共通型</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  {dm.storage_location ?? '—'}
                </TableCell>
                <TableCell className="text-center">
                  {dm.is_active
                    ? <Badge variant="outline" className="text-xs text-green-700 border-green-300">有効</Badge>
                    : <Badge variant="outline" className="text-xs text-gray-400">無効</Badge>}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-end">
                    <DieMoldDialog
                      dieMold={dm}
                      customers={customers}
                      trigger={
                        <Button size="sm" variant="ghost" className="text-xs h-7 px-2">
                          編集
                        </Button>
                      }
                      onDone={reload}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className={`text-xs h-7 px-2 ${dm.is_active ? 'text-red-500 hover:text-red-700' : 'text-blue-500 hover:text-blue-700'}`}
                      onClick={() => handleToggleActive(dm.id, dm.is_active, dm.mold_code)}
                    >
                      {dm.is_active ? '無効化' : '有効化'}
                    </Button>
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
