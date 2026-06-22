'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const CATEGORIES_THICK = ['化粧箱', '台紙', 'カード', 'POP', 'パッケージ', 'その他(厚物)'];
const CATEGORIES_THIN  = ['チラシ', 'パンフレット', '冊子', 'ポスター', 'カタログ', 'その他(薄物)'];

const selectClass = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export default function NewEstimatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title:        '',
    customerName: '',
    productType:  '' as 'thick' | 'thin' | '',
    category:     '',
    note:         '',
  });

  const categories = form.productType === 'thick' ? CATEGORIES_THICK
                   : form.productType === 'thin'  ? CATEGORIES_THIN
                   : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.customerName || !form.productType || !form.category) {
      toast.error('必須項目を入力してください');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/estimates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('作成失敗');
      const created = await res.json();
      toast.success(`見積もり ${created.estimate_number} を作成しました`);
      router.push(`/estimates/${created.id}`);
    } catch {
      toast.error('作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">新規見積もり</h1>
        <p className="text-sm text-gray-500">基本情報を入力して見積もりを作成します</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">基本情報</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* 件名 */}
            <div className="space-y-1">
              <Label htmlFor="title">件名 <span className="text-red-500">*</span></Label>
              <Input
                id="title"
                placeholder="例: ○○様 化粧箱 見積"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            {/* 顧客名 */}
            <div className="space-y-1">
              <Label htmlFor="customerName">顧客名 <span className="text-red-500">*</span></Label>
              <Input
                id="customerName"
                placeholder="例: 株式会社〇〇"
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              />
            </div>

            {/* 製品種別 */}
            <div className="space-y-1">
              <Label htmlFor="productType">製品種別 <span className="text-red-500">*</span></Label>
              <select
                id="productType"
                className={selectClass}
                value={form.productType}
                onChange={(e) => setForm({ ...form, productType: e.target.value as 'thick' | 'thin', category: '' })}
              >
                <option value="">選択してください</option>
                <option value="thick">厚物（箱・カード・POP等）</option>
                <option value="thin">薄物（チラシ・パンフ・冊子等）</option>
              </select>
            </div>

            {/* カテゴリ */}
            <div className="space-y-1">
              <Label htmlFor="category">カテゴリ <span className="text-red-500">*</span></Label>
              <select
                id="category"
                className={selectClass}
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                disabled={!form.productType}
              >
                <option value="">{form.productType ? '選択してください' : '先に製品種別を選択'}</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* 備考 */}
            <div className="space-y-1">
              <Label htmlFor="note">備考</Label>
              <Input
                id="note"
                placeholder="特記事項があれば入力"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? '作成中...' : '見積もりを作成'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                キャンセル
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
