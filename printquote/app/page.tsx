import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">PrintQuote</h1>
        <p className="text-gray-500 mt-1">岡文館印刷所 — 印刷見積もり管理システム</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">見積もり一覧</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">作成済みの見積もりを検索・確認します。</p>
            <Link href="/estimates">
              <Button className="w-full">一覧を開く</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">新規見積もり</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">新しい印刷見積もりを作成します。</p>
            <Link href="/estimates/new">
              <Button className="w-full">作成する</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">用紙マスタ</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">用紙種類・単価を管理します。</p>
            <Link href="/masters/papers">
              <Button variant="outline" className="w-full">管理する</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
