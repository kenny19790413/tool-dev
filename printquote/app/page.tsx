import Link from 'next/link';

export default function Home() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">PrintQuote</h1>
        <p className="text-gray-500 mt-1">岡文館印刷所 — 印刷見積もり管理システム</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
    <Link href={href} className="block">
      <div className="bg-white border rounded-xl p-8 flex flex-col gap-6 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer h-full">
        <div>
          <p className="font-semibold text-gray-900 text-xl">{title}</p>
          <p className="text-sm text-gray-500 mt-2">{desc}</p>
        </div>
        <div className={`w-full py-3 px-4 rounded-md text-center text-sm font-medium mt-auto ${
          primary
            ? 'bg-blue-600 text-white'
            : 'border border-gray-300 text-gray-700'
        }`}>
          {label}
        </div>
      </div>
    </Link>
  );
}
