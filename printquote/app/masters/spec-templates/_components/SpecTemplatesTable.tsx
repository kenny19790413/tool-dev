'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SpecTemplateDialog } from './SpecTemplateDialog';

interface Category { id: number; name: string; }
interface Paper { id: number; name: string; parent_size: string; }
interface SpecRow {
  id: number; name: string; category_name: string | null; paper_name: string | null;
  finish_width_mm: number | null; finish_height_mm: number | null;
  front_colors: number; back_colors: number; coater: string;
  process_types: string[]; default_quantities: string;
  category_id: number | null; paper_id: number | null;
  faces: number; cuts: number; color_type: string; waste_rate: number; note: string | null;
}

const PROCESS_LABEL: Record<string, string> = {
  cutting: '断裁', pp: 'PP', press: 'プレス', emboss: 'エンボス',
  foil: '箔押し', lamination: '合紙', corrugated: '片段', thomson: 'トムソン', packing: '梱包',
};
const COATER_LABEL: Record<string, string> = { none: 'なし', single: '片面', double: '両面' };

export function SpecTemplatesTable({ initial, categories, papers }: { initial: SpecRow[]; categories: Category[]; papers: Paper[] }) {
  const [rows, setRows] = useState<SpecRow[]>(initial);

  const reload = useCallback(async () => {
    const r = await fetch('/api/masters/spec-templates');
    if (r.ok) setRows(await r.json());
  }, []);

  const remove = async (id: number) => {
    await fetch(`/api/masters/spec-templates/${id}`, { method: 'DELETE' });
    setRows(rows.filter(r => r.id !== id));
    toast.success('削除しました');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <SpecTemplateDialog
          categories={categories} papers={papers} onDone={reload}
          trigger={<Button>＋ テンプレートを追加</Button>}
        />
      </div>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 text-xs">
              <TableHead>テンプレート名</TableHead><TableHead>品種</TableHead><TableHead>仕上がりサイズ</TableHead>
              <TableHead>用紙</TableHead><TableHead>色数</TableHead><TableHead>加工</TableHead>
              <TableHead>デフォルト数量</TableHead><TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-gray-400 text-sm">テンプレートがありません</TableCell></TableRow>
            ) : rows.map(r => (
              <TableRow key={r.id} className="text-sm">
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-gray-500">{r.category_name ?? '—'}</TableCell>
                <TableCell>{r.finish_width_mm && r.finish_height_mm ? `${Number(r.finish_width_mm)}×${Number(r.finish_height_mm)}mm` : '—'}</TableCell>
                <TableCell className="text-gray-500">{r.paper_name ?? '—'}</TableCell>
                <TableCell>表{r.front_colors}色／裏{r.back_colors}色<br /><span className="text-xs text-gray-400">{COATER_LABEL[r.coater]}</span></TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(r.process_types ?? []).map(pt => (
                      <Badge key={pt} variant="secondary" className="text-xs">{PROCESS_LABEL[pt] ?? pt}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-gray-500">{r.default_quantities}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <SpecTemplateDialog
                      categories={categories} papers={papers} onDone={reload}
                      initial={{ ...r, finish_width_mm: r.finish_width_mm ? Number(r.finish_width_mm) : null, finish_height_mm: r.finish_height_mm ? Number(r.finish_height_mm) : null }}
                      trigger={<Button size="sm" variant="ghost" className="h-7 px-2 text-xs">編集</Button>}
                    />
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-red-500" onClick={() => remove(r.id)}>削除</Button>
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
