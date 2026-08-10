'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type AssetTypeChoice = 'STOCK' | 'BOND' | 'FUND' | 'PRIVATE';

const TYPE_OPTIONS: { key: AssetTypeChoice; label: string }[] = [
  { key: 'STOCK', label: '単株' },
  { key: 'FUND', label: '投資信託' },
  { key: 'BOND', label: '債券' },
  { key: 'PRIVATE', label: 'プライベート資産' },
];

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
  market: 'JP' | 'US';
}

interface FundPreview {
  name: string | null;
  nav: number;
  navDate: string | null;
}

export default function NewAssetPage() {
  const router = useRouter();
  const [type, setType] = useState<AssetTypeChoice>('STOCK');
  const [submitting, setSubmitting] = useState(false);

  // 株式検索
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [quantity, setQuantity] = useState('');
  const [avgCost, setAvgCost] = useState('');
  const [broker, setBroker] = useState('');

  // 投資信託
  const [fundUrl, setFundUrl] = useState('');
  const [fundChecking, setFundChecking] = useState(false);
  const [fundPreview, setFundPreview] = useState<FundPreview | null>(null);
  const [fundQuantity, setFundQuantity] = useState('');
  const [fundAvgCost, setFundAvgCost] = useState('');
  const [fundBroker, setFundBroker] = useState('');
  const [fundDistribution, setFundDistribution] = useState('');

  // 非株式（債券・プライベート資産）
  const [name, setName] = useState('');
  const [initialValue, setInitialValue] = useState('');
  const [otherCurrency, setOtherCurrency] = useState<'JPY' | 'USD'>('JPY');
  const [broker2, setBroker2] = useState('');
  const [distribution2, setDistribution2] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (type !== 'STOCK' || !query.trim() || (selected && selected.symbol === query)) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/quote/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query, type, selected]);

  async function handleSubmitStock(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) {
      toast.error('銘柄を検索して選択してください');
      return;
    }
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error('数量を正しく入力してください');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'STOCK',
          ticker: selected.symbol,
          name: selected.name,
          quantity: qty,
          avgCost: avgCost || undefined,
          broker: broker || undefined,
          note: note || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '登録に失敗しました');
      toast.success('銘柄を登録しました');
      router.push(`/assets/${data.asset.id}`);
    } catch (err) {
      toast.error(String(err instanceof Error ? err.message : err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCheckFundUrl() {
    if (!fundUrl.trim()) {
      toast.error('URLを入力してください');
      return;
    }
    setFundChecking(true);
    setFundPreview(null);
    try {
      const res = await fetch(`/api/fund/preview?url=${encodeURIComponent(fundUrl)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '取得に失敗しました');
      setFundPreview(data);
      toast.success('基準価額を取得できました');
    } catch (err) {
      toast.error(String(err instanceof Error ? err.message : err));
    } finally {
      setFundChecking(false);
    }
  }

  async function handleSubmitFund(e: React.FormEvent) {
    e.preventDefault();
    if (!fundPreview) {
      toast.error('先にURLを確認してください');
      return;
    }
    const qty = Number(fundQuantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error('口数を正しく入力してください');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'FUND',
          fundUrl,
          name: fundPreview.name ?? undefined,
          quantity: qty,
          avgCost: fundAvgCost || undefined,
          broker: fundBroker || undefined,
          annualDistribution: fundDistribution || undefined,
          note: note || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '登録に失敗しました');
      toast.success('投資信託を登録しました');
      router.push(`/assets/${data.asset.id}`);
    } catch (err) {
      toast.error(String(err instanceof Error ? err.message : err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitOther(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('名称を入力してください');
      return;
    }
    const value = Number(initialValue);
    if (!Number.isFinite(value) || value < 0) {
      toast.error('評価額を正しく入力してください');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          name,
          initialValue: value,
          currency: otherCurrency,
          broker: broker2 || undefined,
          annualDistribution: distribution2 || undefined,
          note: note || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '登録に失敗しました');
      toast.success('資産を登録しました');
      router.push(`/assets/${data.asset.id}`);
    } catch (err) {
      toast.error(String(err instanceof Error ? err.message : err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">資産を追加</h1>

      <div className="flex gap-2 flex-wrap">
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => {
              setType(opt.key);
              setSelected(null);
              setResults([]);
              setQuery('');
              setFundPreview(null);
              setFundUrl('');
              setOtherCurrency('JPY');
            }}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              type === opt.key
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {type === 'STOCK' ? '単株（日本株・米国株）' : TYPE_OPTIONS.find((o) => o.key === type)?.label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {type === 'STOCK' ? (
            <form onSubmit={handleSubmitStock} className="space-y-4">
              <div>
                <Label htmlFor="query">銘柄検索（銘柄コード・企業名・ティッカー）</Label>
                <Input
                  id="query"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelected(null);
                  }}
                  placeholder="例: 7203(銘柄コード) / Toyota / AAPL / Apple ※日本語検索は非対応"
                  className="mt-1"
                  autoComplete="off"
                />
                {searching && <p className="text-xs text-gray-400 mt-1">検索中…</p>}
                {!selected && results.length > 0 && (
                  <ul className="mt-2 border rounded-md divide-y max-h-64 overflow-y-auto bg-white">
                    {results.map((r) => (
                      <li key={r.symbol}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelected(r);
                            setQuery(r.symbol);
                            setResults([]);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                        >
                          <span className="font-medium text-gray-800">{r.name}</span>{' '}
                          <span className="text-gray-400">
                            {r.symbol} ・ {r.market === 'JP' ? '日本株' : '米国株'}
                            {r.exchange ? ` (${r.exchange})` : ''}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {selected && (
                  <p className="mt-2 text-sm bg-blue-50 text-blue-800 px-3 py-2 rounded">
                    選択中: <span className="font-medium">{selected.name}</span> ({selected.symbol}) ・{' '}
                    {selected.market === 'JP' ? '日本株' : '米国株'}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="quantity">保有数量</Label>
                  <Input
                    id="quantity"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="avgCost">取得単価（任意・{selected?.market === 'JP' ? '円' : 'ドル等'}）</Label>
                  <Input
                    id="avgCost"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    value={avgCost}
                    onChange={(e) => setAvgCost(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="broker">証券会社（任意）</Label>
                <Input
                  id="broker"
                  value={broker}
                  onChange={(e) => setBroker(e.target.value)}
                  placeholder="例: SBI証券 / 楽天証券"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="note">メモ（任意）</Label>
                <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} className="mt-1" />
              </div>

              <Button type="submit" disabled={submitting || !selected} className="w-full">
                {submitting ? '登録中…' : '登録する（現在値・配当を自動取得）'}
              </Button>
            </form>
          ) : type === 'FUND' ? (
            <form onSubmit={handleSubmitFund} className="space-y-4">
              <div>
                <Label htmlFor="fundUrl">ファンドの公式ページURL</Label>
                <div className="mt-1 flex gap-2">
                  <Input
                    id="fundUrl"
                    value={fundUrl}
                    onChange={(e) => {
                      setFundUrl(e.target.value);
                      setFundPreview(null);
                    }}
                    placeholder="例: https://www.smd-am.co.jp/fund/200102/"
                    autoComplete="off"
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" onClick={handleCheckFundUrl} disabled={fundChecking}>
                    {fundChecking ? '確認中…' : '確認'}
                  </Button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  運用会社（SBIアセットマネジメント、三菱UFJ国際投信等）のファンド詳細ページURLを貼り付けてください。運用会社によっては対応していない場合があります。
                </p>
                {fundPreview && (
                  <p className="mt-2 text-sm bg-blue-50 text-blue-800 px-3 py-2 rounded">
                    {fundPreview.name && (
                      <>
                        <span className="font-medium">{fundPreview.name}</span>
                        <br />
                      </>
                    )}
                    基準価額: {fundPreview.nav.toLocaleString('ja-JP')}円 / 1万口
                    {fundPreview.navDate ? `（${fundPreview.navDate}時点）` : ''}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="fundQuantity">保有口数</Label>
                  <Input
                    id="fundQuantity"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    value={fundQuantity}
                    onChange={(e) => setFundQuantity(e.target.value)}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="fundAvgCost">取得時基準価額（任意・1万口あたり）</Label>
                  <Input
                    id="fundAvgCost"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    value={fundAvgCost}
                    onChange={(e) => setFundAvgCost(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="fundBroker">証券会社（任意）</Label>
                <Input
                  id="fundBroker"
                  value={fundBroker}
                  onChange={(e) => setFundBroker(e.target.value)}
                  placeholder="例: SBI証券 / 楽天証券"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="fundDistribution">年間分配金（任意・円）</Label>
                <Input
                  id="fundDistribution"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
                  value={fundDistribution}
                  onChange={(e) => setFundDistribution(e.target.value)}
                  placeholder="分配金がない場合は 0（未入力可）"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="fundNote">メモ（任意）</Label>
                <Input id="fundNote" value={note} onChange={(e) => setNote(e.target.value)} className="mt-1" />
              </div>

              <Button type="submit" disabled={submitting || !fundPreview} className="w-full">
                {submitting ? '登録中…' : '登録する'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmitOther} className="space-y-4">
              <div>
                <Label htmlFor="name">名称</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例: ○○社債 / ○○未公開株 / 海外プライベート・エクイティファンド"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label>評価額の通貨</Label>
                <div className="mt-1 flex gap-2">
                  {(['JPY', 'USD'] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setOtherCurrency(c)}
                      className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                        otherCurrency === c
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {c === 'JPY' ? '円（JPY）' : '米ドル（USD）'}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  米国のプライベート・クレジットやプライベート・エクイティ・ファンド等、米ドル建ての資産は「米ドル（USD）」を選んでください。ダッシュボード上は最新の為替レートで円換算されます。
                </p>
              </div>
              <div>
                <Label htmlFor="initialValue">現在の評価額（{otherCurrency === 'JPY' ? '円' : '米ドル'}）</Label>
                <Input
                  id="initialValue"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
                  value={initialValue}
                  onChange={(e) => setInitialValue(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="broker2">証券会社（任意）</Label>
                <Input
                  id="broker2"
                  value={broker2}
                  onChange={(e) => setBroker2(e.target.value)}
                  placeholder="例: SBI証券 / 楽天証券"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="distribution2">年間分配金・配当（任意・{otherCurrency === 'JPY' ? '円' : '米ドル'}）</Label>
                <Input
                  id="distribution2"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
                  value={distribution2}
                  onChange={(e) => setDistribution2(e.target.value)}
                  placeholder="分配金がない場合は 0（未入力可）"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="note2">メモ（任意）</Label>
                <Input id="note2" value={note} onChange={(e) => setNote(e.target.value)} className="mt-1" />
              </div>
              <p className="text-xs text-gray-400">
                この資産は自動取得の対象外のため、評価額は登録後も詳細画面から定期的に手動更新してください。
              </p>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? '登録中…' : '登録する'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
