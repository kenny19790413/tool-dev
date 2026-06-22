import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">PrintQuote</h1>
        <p className="text-gray-500 mt-1">岡文館印刷所 — 印刷見積もり管理システム</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <HomeCard
          title="見積もり一覧"
          desc="作成済みの見積もりを検索・確認します。"
          href="/estimates"
          label="一覧を開く"
          primary
        />
        <HomeCard
          title="新規見積もり"
          desc="新しい印刷見積もりを作成します。"
          href="/estimates/new"
          label="作成する"
          primary
        />
      </div>
    </div>
  );
}

function HomeCard({
  title, desc, href, label, primary = false,
}: {
  title: string;
  desc: string;
  href: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <div className="bg-white border rounded-xl p-6 flex flex-col gap-4 hover:shadow-md transition-shadow">
      <div>
        <p className="font-semibold text-gray-900 text-lg">{title}</p>
        <p className="text-sm text-gray-500 mt-1">{desc}</p>
      </div>
      <Link href={href} className="mt-auto">
        <Button variant={primary ? 'default' : 'outline'} className="w-full">
          {label}
        </Button>
      </Link>
    </div>
  );
}
