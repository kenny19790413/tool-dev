'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MonthPicker } from '@/components/month-picker';
import { formatCurrency } from '@/lib/portfolio';

interface MatchedAsset {
  id: number;
  name: string;
  type: string;
  currency: string;
  quantity: number | null;
  avgCost: number | null;
  annualDistribution: number | null;
  distributionMonths: number[];
}

interface MatchedRef {
  id: number;
  name: string;
  type: string;
}

// 取引履歴CSV由来
interface TransactionGroup {
  csvName: string;
  matched: MatchedRef | null;
  productType: string;
  distribution: { months: number[]; totalAmount: number; suggestedAnnual: number; currency: string } | null;
  buy: { totalQuantity: number; totalAmount: number; weightedUnitPrice: number; currency: string } | null;
}

interface TransactionRow {
  group: TransactionGroup;
  asset: MatchedAsset | null;
  applyDistribution: boolean;
  annualDistribution: number;
  distributionMonths: number[];
}

// 保有残高CSV由来
interface HoldingItem {
  csvName: string;
  productType: string;
  row: { quantity: number | null; acquisitionCostPerUnit: number | null; currency: string };
  matched: MatchedRef | null;
  settlement: { months: number[]; noDistribution: boolean };
  suggestedValuation: number | null;
}

interface HoldingRow {
  item: HoldingItem;
  asset: MatchedAsset | null;
  applyValuation: boolean;
  valuationValue: number;
  applyMonths: boolean;
  distributionMonths: number[];
  applyQuantity: boolean;
  quantityValue: number;
  avgCostValue: number;
}

type ParsedKind = 'transaction' | 'holdings' | null;

export default function ImportCsvPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);
  const [kind, setKind] = useState<ParsedKind>(null);
  const [txRows, setTxRows] = useState<TransactionRow[]>([]);
  const [holdingRows, setHoldingRows] = useState<HoldingRow[]>([]);
  const [applying, setApplying] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileName(e.target.files?.[0]?.name ?? '');
    setKind(null);
    setTxRows([]);
    setHoldingRows([]);
  }

  async function handleParse() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error('CSVファイルを選択してください');
      return;
    }
    setParsing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/import/csv', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '解析に失敗しました');

      const assetsById = new Map<number, MatchedAsset>((data.assets as MatchedAsset[]).map((a) => [a.id, a]));

      if (data.kind === 'holdings') {
        const nextRows: HoldingRow[] = (data.items as HoldingItem[]).map((item) => {
          const asset = item.matched ? (assetsById.get(item.matched.id) ?? null) : null;
          const isFundLike = item.productType === '投信' || item.productType === '外投';
          const isStock = item.productType === '株式';
          const months = [...new Set([...(asset?.distributionMonths ?? []), ...item.settlement.months])].sort(
            (a, b) => a - b
          );
          return {
            item,
            asset,
            applyValuation: !!(isFundLike && asset && item.suggestedValuation !== null),
            valuationValue: item.suggestedValuation ?? 0,
            applyMonths: !!(isFundLike && asset && (item.settlement.months.length > 0 || item.settlement.noDistribution)),
            distributionMonths: months,
            applyQuantity: !!(isStock && asset && item.row.quantity !== null),
            quantityValue: item.row.quantity ?? asset?.quantity ?? 0,
            avgCostValue: item.row.acquisitionCostPerUnit ?? asset?.avgCost ?? 0,
          };
        });
        setKind('holdings');
        setHoldingRows(nextRows);
        toast.success(`${nextRows.length}銘柄の保有残高を検出しました。内容を確認してください。`);
      } else {
        const nextRows: TransactionRow[] = (data.groups as TransactionGroup[]).map((group) => {
          const asset = group.matched ? (assetsById.get(group.matched.id) ?? null) : null;
          const months = group.distribution
            ? [...new Set([...(asset?.distributionMonths ?? []), ...group.distribution.months])].sort((a, b) => a - b)
            : (asset?.distributionMonths ?? []);
          return {
            group,
            asset,
            applyDistribution: !!(group.distribution && asset),
            annualDistribution: group.distribution?.suggestedAnnual ?? asset?.annualDistribution ?? 0,
            distributionMonths: months,
          };
        });
        setKind('transaction');
        setTxRows(nextRows);
        toast.success(`${nextRows.length}銘柄分の取引を検出しました。内容を確認してください。`);
      }
    } catch (err) {
      toast.error(String(err instanceof Error ? err.message : err));
    } finally {
      setParsing(false);
    }
  }

  function updateTxRow(index: number, patch: Partial<TransactionRow>) {
    setTxRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function updateHoldingRow(index: number, patch: Partial<HoldingRow>) {
    setHoldingRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  async function handleApplyTransactions() {
    const targets = txRows.filter((r) => r.applyDistribution && r.asset);
    if (targets.length === 0) {
      toast.error('反映する分配金情報を選択してください');
      return;
    }
    setApplying(true);
    let success = 0;
    let failed = 0;
    for (const row of targets) {
      try {
        const res = await fetch(`/api/assets/${row.asset!.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ annualDistribution: row.annualDistribution, distributionMonths: row.distributionMonths }),
        });
        if (!res.ok) throw new Error();
        success++;
      } catch {
        failed++;
      }
    }
    setApplying(false);
    if (success > 0) toast.success(`${success}件に反映しました${failed ? `（失敗${failed}件）` : ''}`);
    else toast.error('反映に失敗しました');
  }

  async function handleApplyHoldings() {
    const targets = holdingRows.filter((r) => (r.applyValuation || r.applyMonths || r.applyQuantity) && r.asset);
    if (targets.length === 0) {
      toast.error('反映する項目を選択してください');
      return;
    }
    setApplying(true);
    let success = 0;
    let failed = 0;
    for (const row of targets) {
      try {
        if (row.applyMonths || row.applyQuantity) {
          const body: Record<string, unknown> = {};
          if (row.applyMonths) body.distributionMonths = row.distributionMonths;
          if (row.applyQuantity) {
            body.quantity = row.quantityValue;
            body.avgCost = row.avgCostValue;
          }
          const res = await fetch(`/api/assets/${row.asset!.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          if (!res.ok) throw new Error();
        }
        if (row.applyValuation) {
          const res = await fetch(`/api/assets/${row.asset!.id}/valuations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value: row.valuationValue, note: 'CSV取込による評価額更新' }),
          });
          if (!res.ok) throw new Error();
        }
        success++;
      } catch {
        failed++;
      }
    }
    setApplying(false);
    if (success > 0) toast.success(`${success}件に反映しました${failed ? `（失敗${failed}件）` : ''}`);
    else toast.error('反映に失敗しました');
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">証券会社のCSVから取り込む</h1>
      <p className="text-sm text-gray-500">
        岡三証券・みずほ証券の「取引履歴」CSVと、岡三証券の「預り資産（預り証券）」CSVに対応しています。ファイルの種類は自動判別します。
        「預り資産」CSVの株式銘柄は、現時点の保有数量・取得単価をそのまま反映できます（内容を確認してからチェックを入れてください）。
        「取引履歴」CSVの購入取引は、売却分を考慮していない単純集計のため参考情報のみで自動反映は行いません。
        <Link href="/assets" className="text-blue-600 underline ml-1">
          資産一覧に戻る
        </Link>
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">CSVファイルを選択</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-gray-300 file:bg-white file:text-sm"
          />
          {fileName && <p className="text-xs text-gray-400">選択中: {fileName}</p>}
          <Button onClick={handleParse} disabled={parsing || !fileName}>
            {parsing ? '解析中…' : 'このCSVを解析する'}
          </Button>
        </CardContent>
      </Card>

      {kind === 'transaction' && txRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">検出結果（取引履歴・{txRows.length}銘柄）</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {txRows.map((row, i) => (
              <div key={i} className="border rounded-md p-3 space-y-3">
                <div>
                  <p className="font-medium text-gray-800">{row.group.csvName}</p>
                  {row.asset ? (
                    <p className="text-xs text-gray-400">
                      登録済み資産:{' '}
                      <Link href={`/assets/${row.asset.id}`} className="text-blue-600 underline">
                        {row.asset.name}
                      </Link>
                    </p>
                  ) : (
                    <p className="text-xs text-amber-600">
                      一致する登録済み資産が見つかりません。先に「資産を追加」から登録してから再度取り込んでください。
                    </p>
                  )}
                </div>

                {row.group.distribution && (
                  <div className="bg-blue-50 rounded-md p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={row.applyDistribution}
                        disabled={!row.asset}
                        onChange={(e) => updateTxRow(i, { applyDistribution: e.target.checked })}
                      />
                      <span className="text-sm font-medium text-blue-900">
                        分配金を反映する（CSV期間内の検出額合計:{' '}
                        {formatCurrency(row.group.distribution.totalAmount, row.group.distribution.currency)}）
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6">
                      <div>
                        <Label className="text-xs text-gray-500">年間分配金見込み額（{row.group.distribution.currency}）</Label>
                        <Input
                          type="number"
                          value={row.annualDistribution}
                          onChange={(e) => updateTxRow(i, { annualDistribution: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500 mb-1 block">入金月</Label>
                        <MonthPicker
                          value={row.distributionMonths}
                          onChange={(months) => updateTxRow(i, { distributionMonths: months })}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {row.group.buy && (
                  <p className="text-xs text-gray-500 bg-gray-50 rounded-md p-2">
                    購入取引を検出（参考情報・自動反映なし）: 数量{row.group.buy.totalQuantity.toLocaleString('ja-JP')} ・
                    購入額合計{formatCurrency(row.group.buy.totalAmount, row.group.buy.currency)}
                  </p>
                )}
              </div>
            ))}

            <Button onClick={handleApplyTransactions} disabled={applying} className="w-full">
              {applying ? '反映中…' : `選択した${txRows.filter((r) => r.applyDistribution).length}件の分配金情報を反映する`}
            </Button>
          </CardContent>
        </Card>
      )}

      {kind === 'holdings' && holdingRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">検出結果（保有残高・{holdingRows.length}銘柄）</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {holdingRows.map((row, i) => {
              const isFundLike = row.item.productType === '投信' || row.item.productType === '外投';
              return (
                <div key={i} className="border rounded-md p-3 space-y-3">
                  <div>
                    <p className="font-medium text-gray-800">
                      {row.item.csvName}
                      <span className="ml-2 text-xs text-gray-400">（{row.item.productType}）</span>
                    </p>
                    {row.asset ? (
                      <p className="text-xs text-gray-400">
                        登録済み資産:{' '}
                        <Link href={`/assets/${row.asset.id}`} className="text-blue-600 underline">
                          {row.asset.name}
                        </Link>
                      </p>
                    ) : (
                      <p className="text-xs text-amber-600">
                        一致する登録済み資産が見つかりません。
                        {row.item.productType === '株式'
                          ? '株式の新規登録には対応していないため「資産を追加」から登録してください。'
                          : '先に「資産を追加」から登録してから再度取り込んでください。'}
                      </p>
                    )}
                  </div>

                  {isFundLike && row.asset && (
                    <div className="bg-blue-50 rounded-md p-3 space-y-3">
                      {row.item.suggestedValuation !== null && (
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={row.applyValuation}
                            onChange={(e) => updateHoldingRow(i, { applyValuation: e.target.checked })}
                          />
                          <span className="text-sm font-medium text-blue-900">評価額を記録する</span>
                          <Input
                            type="number"
                            value={row.valuationValue}
                            onChange={(e) => updateHoldingRow(i, { valuationValue: Number(e.target.value) })}
                            className="w-40 h-8"
                          />
                          <span className="text-xs text-gray-500">{row.item.row.currency}</span>
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <input
                            type="checkbox"
                            checked={row.applyMonths}
                            onChange={(e) => updateHoldingRow(i, { applyMonths: e.target.checked })}
                          />
                          <span className="text-sm font-medium text-blue-900">
                            入金月を更新する
                            {row.item.settlement.noDistribution && '（CSV上「無分配」と表記）'}
                          </span>
                        </div>
                        <div className="pl-6">
                          <MonthPicker
                            value={row.distributionMonths}
                            onChange={(months) => updateHoldingRow(i, { distributionMonths: months })}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {row.item.productType === '株式' && row.asset && row.item.row.quantity !== null && (
                    <div className="bg-blue-50 rounded-md p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={row.applyQuantity}
                          onChange={(e) => updateHoldingRow(i, { applyQuantity: e.target.checked })}
                        />
                        <span className="text-sm font-medium text-blue-900">保有数量・取得単価を更新する</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6">
                        <div>
                          <Label className="text-xs text-gray-500">保有数量</Label>
                          <Input
                            type="number"
                            value={row.quantityValue}
                            onChange={(e) => updateHoldingRow(i, { quantityValue: Number(e.target.value) })}
                          />
                          {row.asset.quantity !== null && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              現在の登録値: {row.asset.quantity.toLocaleString('ja-JP')}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">取得単価（円）</Label>
                          <Input
                            type="number"
                            value={row.avgCostValue}
                            onChange={(e) => updateHoldingRow(i, { avgCostValue: Number(e.target.value) })}
                          />
                          {row.asset.avgCost !== null && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              現在の登録値: {row.asset.avgCost.toLocaleString('ja-JP')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {row.item.productType === '株式' && (!row.asset || row.item.row.quantity === null) && (
                    <p className="text-xs text-gray-500 bg-gray-50 rounded-md p-2">
                      保有数量{row.item.row.quantity?.toLocaleString('ja-JP') ?? '-'}
                      {row.item.row.acquisitionCostPerUnit !== null &&
                        ` ・取得コスト${row.item.row.acquisitionCostPerUnit.toLocaleString('ja-JP')}円/株`}
                      （参考情報・自動反映なし）
                    </p>
                  )}
                </div>
              );
            })}

            <Button onClick={handleApplyHoldings} disabled={applying} className="w-full">
              {applying
                ? '反映中…'
                : `選択した${holdingRows.filter((r) => r.applyValuation || r.applyMonths || r.applyQuantity).length}件を反映する`}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
