'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MonthPicker } from '@/components/month-picker';
import { BrokerInput } from '@/components/broker-input';

interface Props {
  assetId: number;
  quantity: number | null;
  avgCost: number | null;
  broker: string | null;
  note: string | null;
  showQuantityFields: boolean;
  annualDistribution?: number | null;
  distributionCurrency?: string;
  showDistributionField?: boolean;
  distributionMonths?: number[];
  showShareholderPerkFields?: boolean;
  shareholderPerk?: string | null;
  shareholderPerkMonths?: number[];
}

export function EditAssetForm({
  assetId,
  quantity,
  avgCost,
  broker,
  note,
  showQuantityFields,
  annualDistribution,
  distributionCurrency,
  showDistributionField,
  distributionMonths,
  showShareholderPerkFields,
  shareholderPerk,
  shareholderPerkMonths,
}: Props) {
  const router = useRouter();
  const [qty, setQty] = useState(quantity !== null ? String(quantity) : '');
  const [cost, setCost] = useState(avgCost !== null ? String(avgCost) : '');
  const [brokerName, setBrokerName] = useState(broker ?? '');
  const [memo, setMemo] = useState(note ?? '');
  const [distribution, setDistribution] = useState(
    annualDistribution !== null && annualDistribution !== undefined ? String(annualDistribution) : ''
  );
  const [months, setMonths] = useState<number[]>(distributionMonths ?? []);
  const [perk, setPerk] = useState(shareholderPerk ?? '');
  const [perkMonths, setPerkMonths] = useState<number[]>(shareholderPerkMonths ?? []);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, unknown> = { note: memo, broker: brokerName, distributionMonths: months };
      if (showQuantityFields) {
        body.quantity = qty;
        body.avgCost = cost;
      }
      if (showDistributionField) {
        body.annualDistribution = distribution;
      }
      if (showShareholderPerkFields) {
        body.shareholderPerk = perk;
        body.shareholderPerkMonths = perkMonths;
      }
      const res = await fetch(`/api/assets/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '更新に失敗しました');
      toast.success('保存しました');
      router.refresh();
    } catch (e) {
      toast.error(String(e instanceof Error ? e.message : e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {showQuantityFields && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="qty">保有数量</Label>
            <Input
              id="qty"
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="cost">取得単価</Label>
            <Input
              id="cost"
              type="number"
              inputMode="decimal"
              step="any"
              min="0"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
      )}
      {showDistributionField && (
        <div>
          <Label htmlFor="distribution">年間分配金・配当（{distributionCurrency}、任意）</Label>
          <Input
            id="distribution"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            value={distribution}
            onChange={(e) => setDistribution(e.target.value)}
            placeholder="分配金がない場合は 0 を入力"
            className="mt-1"
          />
          <p className="text-xs text-gray-400 mt-1">
            年間の受取見込み総額を入力してください。分配金がない資産は「0」を入力すると一覧で「分配金なし」と表示されます。未入力のままだと「未入力」と表示されます。
          </p>
        </div>
      )}
      <div>
        <Label>配当・分配金が支払われる月（任意）</Label>
        <div className="mt-1">
          <MonthPicker value={months} onChange={setMonths} />
        </div>
        <p className="text-xs text-gray-400 mt-1">
          決算日・分配日の月を選択してください（複数選択可）。単純な「年間見込み÷12」ではなく、実際の入金予定月を確認できるようになります。
        </p>
      </div>
      {showShareholderPerkFields && (
        <div>
          <Label htmlFor="perk">株主優待（任意）</Label>
          <Input
            id="perk"
            value={perk}
            onChange={(e) => setPerk(e.target.value)}
            placeholder="例: クオカード1,000円分"
            className="mt-1"
          />
          <Label className="mt-2 block">優待の権利確定月</Label>
          <div className="mt-1">
            <MonthPicker value={perkMonths} onChange={setPerkMonths} />
          </div>
        </div>
      )}
      <div>
        <Label htmlFor="broker">証券会社</Label>
        <BrokerInput id="broker" value={brokerName} onChange={setBrokerName} className="mt-1" />
      </div>
      <div>
        <Label htmlFor="memo">メモ</Label>
        <Input id="memo" value={memo} onChange={(e) => setMemo(e.target.value)} className="mt-1" />
      </div>
      <Button type="submit" size="sm" disabled={saving}>
        {saving ? '保存中…' : '保存'}
      </Button>
    </form>
  );
}
