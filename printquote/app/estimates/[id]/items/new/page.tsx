'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

type PaperRow = {
  id: number;
  name: string;
  parent_size: string;
  width_mm: number;
  height_mm: number;
  unit_price: number;
};

const PROCESSINGS = [
  { key: 'cutting',    label: '断裁' },
  { key: 'pp',         label: 'PP加工' },
  { key: 'press',      label: 'プレス（ニス引き）' },
  { key: 'emboss',     label: 'エンボス' },
  { key: 'foil',       label: '箔押し' },
  { key: 'lamination', label: '合紙' },
  { key: 'corrugated', label: '片段合紙' },
  { key: 'thomson',    label: 'トムソン抜き' },
  { key: 'packing',    label: '梱包' },
];

type Form = {
  itemName: string;
  finishWidthMm: string;
  finishHeightMm: string;
  paperId: string;
  faces: string;
  cuts: string;
  frontColors: string;
  backColors: string;
  coater: string;
  colorType: string;
  wasteRate: string;
  hasMold: boolean;
  moldComplexity: string;
  quantities: string;
  note: string;
};

export default function NewItemPage() {
  const params = useParams();
  const router = useRouter();
  const estimateId = params?.id as string;

  const [papers, setPapers] = useState<PaperRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [processTypes, setProcessTypes] = useState<string[]>(['cutting']);
  const [form, setForm] = useState<Form>({
    itemName: '',
    finishWidthMm: '',
    finishHeightMm: '',
    paperId: '',
    faces: '1',
    cuts: '1',
    frontColors: '4',
    backColors: '0',
    coater: 'none',
    colorType: 'process',
    wasteRate: '15',
    hasMold: false,
    moldComplexity: '1',
    quantities: '1000,3000,5000',
    note: '',
  });

  useEffect(() => {
    fetch('/api/masters/papers')
      .then((r) => r.json())
      .then(setPapers)
      .catch(() => toast.error('用紙マスタの取得に失敗しました'));
  }, []);

  const setF = (k: keyof Form, v: string | boolean) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const toggleProcess = (key: string) =>
    setProcessTypes((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );

  const hasThomson = processTypes.includes('thomson');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.itemName || !form.finishWidthMm || !form.finishHeightMm || !form.paperId) {
      toast.error('必須項目を入力してください（品目名・サイズ・用紙）');
      return;
    }

    const quantitiesArr = form.quantities
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0);

    if (quantitiesArr.length === 0) {
      toast.error('有効な数量を1つ以上入力してください');
      return;
    }

    setLoading(true);
    try {
      // Step1: 明細を保存
      const itemRes = await fetch(`/api/estimates/${estimateId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: form.itemName,
          finishWidthMm: parseFloat(form.finishWidthMm),
          finishHeightMm: parseFloat(form.finishHeightMm),
          paperId: parseInt(form.paperId, 10),
          faces: parseInt(form.faces, 10),
          cuts: parseInt(form.cuts, 10),
          frontColors: parseInt(form.frontColors, 10),
          backColors: parseInt(form.backColors, 10),
          coater: form.coater,
          colorType: form.colorType,
          wasteRate: parseFloat(form.wasteRate),
          hasMold: form.hasMold,
          moldComplexity: parseInt(form.moldComplexity, 10),
          processTypes,
          note: form.note || null,
        }),
      });
      if (!itemRes.ok) {
        const err = await itemRes.json();
        throw new Error(err.error ?? '明細保存失敗');
      }
      const savedItem = await itemRes.json();

      // Step2: 計算実行
      const calcRes = await fetch(`/api/estimates/${estimateId}/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: savedItem.id, quantities: quantitiesArr }),
      });
      if (!calcRes.ok) {
        const err = await calcRes.json();
        throw new Error(err.error ?? '計算失敗');
      }

      toast.success('明細と計算結果を保存しました');
      router.push(`/estimates/${estimateId}`);
    } catch (err) {
      toast.error(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.back()}>← 戻る</Button>
        <div>
          <h1 className="text-xl font-bold">明細を追加</h1>
          <p className="text-sm text-gray-500">用紙・印刷仕様・加工工程を入力します</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 基本情報 */}
        <Card>
          <CardHeader><CardTitle className="text-sm">基本情報</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>品目名 <span className="text-red-500">*</span></Label>
              <Input
                placeholder="例: 化粧箱 表面"
                value={form.itemName}
                onChange={(e) => setF('itemName', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>仕上がり幅 mm <span className="text-red-500">*</span></Label>
                <Input
                  type="number" min={1} placeholder="例: 100"
                  value={form.finishWidthMm}
                  onChange={(e) => setF('finishWidthMm', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>仕上がり高さ mm <span className="text-red-500">*</span></Label>
                <Input
                  type="number" min={1} placeholder="例: 150"
                  value={form.finishHeightMm}
                  onChange={(e) => setF('finishHeightMm', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 用紙・面付け */}
        <Card>
          <CardHeader><CardTitle className="text-sm">用紙・面付け</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>用紙 <span className="text-red-500">*</span></Label>
              <Select value={form.paperId} onValueChange={(v) => setF('paperId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="用紙を選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {papers.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}（{p.parent_size} / ¥{Number(p.unit_price).toLocaleString()}/連）
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>面付け数</Label>
                <Input
                  type="number" min={1}
                  value={form.faces}
                  onChange={(e) => setF('faces', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>カット数</Label>
                <Input
                  type="number" min={1}
                  value={form.cuts}
                  onChange={(e) => setF('cuts', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 印刷仕様 */}
        <Card>
          <CardHeader><CardTitle className="text-sm">印刷仕様</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>表色数（0〜6）</Label>
                <Input
                  type="number" min={0} max={6}
                  value={form.frontColors}
                  onChange={(e) => setF('frontColors', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>裏色数（0〜4）</Label>
                <Input
                  type="number" min={0} max={4}
                  value={form.backColors}
                  onChange={(e) => setF('backColors', e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>コーター</Label>
                <Select value={form.coater} onValueChange={(v) => setF('coater', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">なし</SelectItem>
                    <SelectItem value="single">片面</SelectItem>
                    <SelectItem value="double">両面</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>カラー種別</Label>
                <Select value={form.colorType} onValueChange={(v) => setF('colorType', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="process">プロセス印刷</SelectItem>
                    <SelectItem value="special">特色印刷</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>ヤレ率 %</Label>
                <Input
                  type="number" min={0} max={50}
                  value={form.wasteRate}
                  onChange={(e) => setF('wasteRate', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 加工工程 */}
        <Card>
          <CardHeader><CardTitle className="text-sm">加工工程</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {PROCESSINGS.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer text-sm select-none">
                  <Checkbox
                    checked={processTypes.includes(key)}
                    onCheckedChange={() => toggleProcess(key)}
                  />
                  {label}
                </label>
              ))}
            </div>

            {/* トムソン設定 */}
            {hasThomson && (
              <div className="mt-2 pt-4 border-t space-y-3">
                <p className="text-sm font-medium text-gray-700">トムソン設定</p>
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <Checkbox
                    checked={form.hasMold}
                    onCheckedChange={(v) => setF('hasMold', Boolean(v))}
                  />
                  既存の型あり（型代¥0）
                </label>
                {!form.hasMold && (
                  <div className="space-y-1">
                    <Label>木型の複雑度（1〜5）</Label>
                    <Select
                      value={form.moldComplexity}
                      onValueChange={(v) => setF('moldComplexity', v)}
                    >
                      <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 — 単純</SelectItem>
                        <SelectItem value="2">2 — やや複雑</SelectItem>
                        <SelectItem value="3">3 — 標準</SelectItem>
                        <SelectItem value="4">4 — 複雑</SelectItem>
                        <SelectItem value="5">5 — 非常に複雑</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 数量 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">計算数量（カンマ区切りで複数入力）</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="例: 1000, 3000, 5000"
              value={form.quantities}
              onChange={(e) => setF('quantities', e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1.5">
              複数の数量を入力すると、詳細ページで比較表が表示されます
            </p>
          </CardContent>
        </Card>

        {/* 備考 */}
        <Card>
          <CardHeader><CardTitle className="text-sm">備考（任意）</CardTitle></CardHeader>
          <CardContent>
            <Input
              placeholder="特記事項があれば入力"
              value={form.note}
              onChange={(e) => setF('note', e.target.value)}
            />
          </CardContent>
        </Card>

        <div className="flex gap-3 pb-8">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? '保存・計算中...' : '保存して計算する'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            キャンセル
          </Button>
        </div>
      </form>
    </div>
  );
}
