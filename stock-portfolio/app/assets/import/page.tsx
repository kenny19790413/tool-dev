'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrokerInput } from '@/components/broker-input';

interface Row {
  selected: boolean;
  name: string;
  quantity: number | null;
  currency: 'JPY' | 'USD';
  evaluationValueJpy: number | null;
  foreignValue: number | null;
  referencePrice: number | null;
  note: string | null;
  broker: string;
}

export default function ImportAssetsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [parsing, setParsing] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [bulkBroker, setBulkBroker] = useState('');
  const [registering, setRegistering] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setRows([]);
    setPreviewUrls(files.map((f) => URL.createObjectURL(f)));
  }

  async function handleParse() {
    const files = Array.from(fileInputRef.current?.files ?? []);
    if (files.length === 0) {
      toast.error('画像を選択してください');
      return;
    }
    setParsing(true);
    try {
      const formData = new FormData();
      for (const file of files) formData.append('images', file);
      const res = await fetch('/api/import/parse', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '解析に失敗しました');
      setRows(
        data.holdings.map(
          (h: {
            name: string;
            quantity: number | null;
            currency: 'JPY' | 'USD';
            evaluationValueJpy: number | null;
            foreignValue: number | null;
            referencePrice: number | null;
            note: string | null;
          }) => ({ ...h, selected: true, broker: '' })
        )
      );
      toast.success(`${data.holdings.length}件の銘柄を読み取りました。内容を確認してください。`);
    } catch (err) {
      toast.error(String(err instanceof Error ? err.message : err));
    } finally {
      setParsing(false);
    }
  }

  function updateRow<K extends keyof Row>(index: number, key: K, value: Row[K]) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [key]: value } : r)));
  }

  async function handleRegister() {
    const targets = rows.filter((r) => r.selected);
    if (targets.length === 0) {
      toast.error('登録する銘柄を選択してください');
      return;
    }
    setRegistering(true);
    let success = 0;
    let failed = 0;
    for (const row of targets) {
      const initialValue = row.currency === 'USD' && row.foreignValue !== null ? row.foreignValue : row.evaluationValueJpy;
      if (initialValue === null || !Number.isFinite(initialValue)) {
        failed++;
        continue;
      }
      const noteParts: string[] = [];
      if (row.quantity !== null) noteParts.push(`保有数量${row.quantity.toLocaleString('ja-JP')}`);
      if (row.referencePrice !== null) noteParts.push(`参考時価${row.referencePrice.toLocaleString('ja-JP')}`);
      if (row.note) noteParts.push(row.note);

      try {
        const res = await fetch('/api/assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'PRIVATE',
            name: row.name,
            initialValue,
            currency: row.currency,
            broker: row.broker || bulkBroker || undefined,
            note: noteParts.join(' ') || undefined,
          }),
        });
        if (!res.ok) throw new Error();
        success++;
      } catch {
        failed++;
      }
    }
    setRegistering(false);
    if (success > 0) {
      toast.success(`${success}件登録しました${failed ? `（失敗${failed}件）` : ''}`);
      router.push('/assets');
    } else {
      toast.error('登録に失敗しました');
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">画像から資産を追加</h1>
      <p className="text-sm text-gray-500">
        証券会社サイトの保有資産一覧のスクリーンショットをアップロードすると、AIが銘柄名・保有数量・評価額を自動で読み取ります。読み取り内容は登録前に確認・修正できます。一覧が複数ページにまたがる場合は、複数枚まとめて選択してください。
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">画像を選択（複数選択可）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-gray-300 file:bg-white file:text-sm"
          />
          {previewUrls.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {previewUrls.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={url} alt={`プレビュー${i + 1}`} className="max-h-40 rounded-md border" />
              ))}
            </div>
          )}
          <Button onClick={handleParse} disabled={parsing || previewUrls.length === 0}>
            {parsing
              ? '解析中…'
              : previewUrls.length > 1
                ? `${previewUrls.length}枚の画像を解析する`
                : 'この画像を解析する'}
          </Button>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">読み取り結果（{rows.length}件）</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="bulkBroker">証券会社（一括設定・個別入力欄が空の場合に適用）</Label>
              <BrokerInput
                id="bulkBroker"
                value={bulkBroker}
                onChange={setBulkBroker}
                placeholder="例: 岡三証券"
                className="mt-1 max-w-xs"
              />
            </div>

            <div className="space-y-3">
              {rows.map((row, i) => (
                <div key={i} className="border rounded-md p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={row.selected}
                      onChange={(e) => updateRow(i, 'selected', e.target.checked)}
                      className="mt-2"
                    />
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-gray-400">名称</Label>
                        <Input value={row.name} onChange={(e) => updateRow(i, 'name', e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-400">証券会社（個別・任意）</Label>
                        <BrokerInput
                          id={`broker-${i}`}
                          value={row.broker}
                          onChange={(v) => updateRow(i, 'broker', v)}
                          placeholder={bulkBroker || '例: SBI証券'}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-400">評価額（円）</Label>
                        <Input
                          type="number"
                          value={row.evaluationValueJpy ?? ''}
                          onChange={(e) => updateRow(i, 'evaluationValueJpy', e.target.value === '' ? null : Number(e.target.value))}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-gray-400">通貨</Label>
                          <select
                            value={row.currency}
                            onChange={(e) => updateRow(i, 'currency', e.target.value as 'JPY' | 'USD')}
                            className="mt-1 w-full h-9 rounded-md border border-gray-300 px-2 text-sm"
                          >
                            <option value="JPY">円（JPY）</option>
                            <option value="USD">米ドル（USD）</option>
                          </select>
                        </div>
                        {row.currency === 'USD' && (
                          <div>
                            <Label className="text-xs text-gray-400">外貨評価額（$）</Label>
                            <Input
                              type="number"
                              value={row.foreignValue ?? ''}
                              onChange={(e) => updateRow(i, 'foreignValue', e.target.value === '' ? null : Number(e.target.value))}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {(row.quantity !== null || row.note) && (
                    <p className="text-xs text-gray-400 pl-6">
                      {row.quantity !== null && `保有数量: ${row.quantity.toLocaleString('ja-JP')} `}
                      {row.note}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <Button onClick={handleRegister} disabled={registering} className="w-full">
              {registering ? '登録中…' : `選択した${rows.filter((r) => r.selected).length}件を登録する`}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
