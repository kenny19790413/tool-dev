'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Category { id: number; name: string; }
interface Paper { id: number; name: string; parent_size: string; }
interface SpecTemplate {
  id?: number;
  name: string;
  category_id: number | null;
  finish_width_mm: number | null;
  finish_height_mm: number | null;
  paper_id: number | null;
  faces: number;
  cuts: number;
  front_colors: number;
  back_colors: number;
  coater: string;
  color_type: string;
  waste_rate: number;
  process_types: string[];
  default_quantities: string;
  note: string | null;
}

const PROCESSINGS = [
  { key: 'cutting', label: '断裁' }, { key: 'pp', label: 'PP加工' },
  { key: 'press', label: 'プレス' }, { key: 'emboss', label: 'エンボス' },
  { key: 'foil', label: '箔押し' }, { key: 'lamination', label: '合紙' },
  { key: 'corrugated', label: '片段合紙' }, { key: 'thomson', label: 'トムソン抜き' },
  { key: 'packing', label: '梱包' },
];

const DEFAULT: SpecTemplate = {
  name: '', category_id: null, finish_width_mm: null, finish_height_mm: null,
  paper_id: null, faces: 1, cuts: 1, front_colors: 4, back_colors: 0,
  coater: 'none', color_type: 'process', waste_rate: 15, process_types: ['cutting'],
  default_quantities: '1000,3000,5000', note: null,
};

export function SpecTemplateDialog({
  categories, papers, initial, onDone, trigger,
}: {
  categories: Category[];
  papers: Paper[];
  initial?: SpecTemplate;
  onDone: () => void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SpecTemplate>(initial ?? DEFAULT);

  const setF = (k: keyof SpecTemplate, v: unknown) => setForm(f => ({ ...f, [k]: v }));
  const toggleProcess = (key: string) =>
    setF('process_types', form.process_types.includes(key)
      ? form.process_types.filter(k => k !== key)
      : [...form.process_types, key]);

  const submit = async () => {
    if (!form.name) { toast.error('テンプレート名は必須です'); return; }
    const body = {
      name: form.name, categoryId: form.category_id, finishWidthMm: form.finish_width_mm,
      finishHeightMm: form.finish_height_mm, paperId: form.paper_id, faces: form.faces,
      cuts: form.cuts, frontColors: form.front_colors, backColors: form.back_colors,
      coater: form.coater, colorType: form.color_type, wasteRate: form.waste_rate,
      processTypes: form.process_types, defaultQuantities: form.default_quantities, note: form.note,
    };
    const url = form.id ? `/api/masters/spec-templates/${form.id}` : '/api/masters/spec-templates';
    const method = form.id ? 'PATCH' : 'POST';
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) { toast.error('保存失敗'); return; }
    toast.success(form.id ? '更新しました' : '登録しました');
    setOpen(false);
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={o => { setOpen(o); if (o) setForm(initial ?? DEFAULT); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{form.id ? '仕様テンプレートを編集' : '仕様テンプレートを新規作成'}</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div><Label>テンプレート名 *</Label><Input value={form.name} onChange={e => setF('name', e.target.value)} placeholder="例: A4チラシ 両面4色" /></div>
          <div><Label>品種</Label>
            <Select value={form.category_id ? String(form.category_id) : ''} onValueChange={v => setF('category_id', v ? Number(v) : null)}>
              <SelectTrigger><SelectValue placeholder="品種を選択（任意）" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">—</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>仕上げ幅 mm</Label><Input type="number" value={form.finish_width_mm ?? ''} onChange={e => setF('finish_width_mm', e.target.value ? Number(e.target.value) : null)} /></div>
            <div><Label>仕上げ高さ mm</Label><Input type="number" value={form.finish_height_mm ?? ''} onChange={e => setF('finish_height_mm', e.target.value ? Number(e.target.value) : null)} /></div>
          </div>
          <div><Label>用紙</Label>
            <Select value={form.paper_id ? String(form.paper_id) : ''} onValueChange={v => setF('paper_id', v ? Number(v) : null)}>
              <SelectTrigger><SelectValue placeholder="用紙を選択（任意）" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">—</SelectItem>
                {papers.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}（{p.parent_size}）</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div><Label>面付け</Label><Input type="number" min={1} value={form.faces} onChange={e => setF('faces', Number(e.target.value))} /></div>
            <div><Label>カット数</Label><Input type="number" min={1} value={form.cuts} onChange={e => setF('cuts', Number(e.target.value))} /></div>
            <div><Label>表色数</Label><Input type="number" min={0} max={6} value={form.front_colors} onChange={e => setF('front_colors', Number(e.target.value))} /></div>
            <div><Label>裏色数</Label><Input type="number" min={0} max={4} value={form.back_colors} onChange={e => setF('back_colors', Number(e.target.value))} /></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label>コーター</Label>
              <Select value={form.coater} onValueChange={v => setF('coater', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">なし</SelectItem>
                  <SelectItem value="single">片面</SelectItem>
                  <SelectItem value="double">両面</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>カラー種別</Label>
              <Select value={form.color_type} onValueChange={v => setF('color_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="process">プロセス</SelectItem>
                  <SelectItem value="special">特色</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>ヤレ率 %</Label><Input type="number" min={0} value={form.waste_rate} onChange={e => setF('waste_rate', Number(e.target.value))} /></div>
          </div>
          <div>
            <Label className="mb-2 block">加工工程</Label>
            <div className="grid grid-cols-3 gap-2">
              {PROCESSINGS.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <Checkbox checked={form.process_types.includes(key)} onCheckedChange={() => toggleProcess(key)} />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div><Label>デフォルト数量（カンマ区切り）</Label><Input value={form.default_quantities} onChange={e => setF('default_quantities', e.target.value)} placeholder="例: 1000,3000,5000" /></div>
          <div><Label>備考</Label><Input value={form.note ?? ''} onChange={e => setF('note', e.target.value || null)} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>キャンセル</Button>
            <Button onClick={submit}>保存</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
