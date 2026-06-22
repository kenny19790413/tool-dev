import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center pt-16 space-y-10">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">PrintQuote</h1>
        <p className="text-gray-500 mt-1 text-sm">岡文館印刷所 — 印刷見積もり管理システム</p>
      </div>

      <div className="grid grid-cols-2 gap-5 w-full max-w-lg">
        <HomeCard href="/estimates" label="見積もり一覧" desc="作成済みの見積もりを確認" primary />
        <HomeCard href="/estimates/new" label="新規見積もり" desc="新しい見積もりを作成" primary />
      </div>
    </div>
  );
}

function HomeCard({ href, label, desc, primary = false }: {
  href: string; label: string; desc: string; primary?: boolean;
}) {
  return (
    <Link href={href} className="block">
      <div className="bg-white border rounded-xl p-5 flex flex-col gap-3 hover:shadow-md hover:border-blue-300 transition-all text-center">
        <p className="font-semibold text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{desc}</p>
        <div className={`py-2 rounded-md text-sm font-medium ${
          primary ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700'
        }`}>
          開く
        </div>
      </div>
    </Link>
  );
}
