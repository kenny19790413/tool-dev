import Link from 'next/link';

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-amber-600 text-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <span className="text-lg font-bold tracking-tight">資産管理 — ゲスト体験モード</span>
          <Link
            href="/login"
            className="text-sm font-medium bg-white text-amber-700 rounded-full px-3 py-1.5 hover:bg-amber-50"
          >
            ログインはこちら
          </Link>
        </div>
        <div className="max-w-4xl mx-auto px-4 pb-2 text-xs text-amber-100">
          ここに表示されているデータはすべて架空のサンプルです。実際の資産情報ではありません。
        </div>
      </header>
      <main className="max-w-4xl mx-auto w-full px-4 py-6">{children}</main>
    </div>
  );
}
