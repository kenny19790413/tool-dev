import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getSession } from '@/lib/auth';

export default async function Home() {
  const session = await getSession();
  const isAdmin = session?.role === 'admin';

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">PrintQuote</h1>
        <p className="text-gray-500 mt-1">岡文館印刷所 — 印刷見積もり管理システム</p>
      </div>

      {/* 見積もり */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">見積もり</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <HomeCard
            title="見積もり一覧"
            desc="作成済みの見積もりを検索・確認します。"
            href="/estimates"
            label="一覧を開く"
          />
          <HomeCard
            title="新規見積もり"
            desc="新しい印刷見積もりを作成します。"
            href="/estimates/new"
            label="作成する"
          />
        </div>
      </section>

      {/* マスタ管理（管理者のみ） */}
      {isAdmin && (
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">マスタ管理</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <HomeCard title="用紙マスタ" desc="用紙種類・単価を管理します。" href="/masters/papers" label="管理する" outline />
            <HomeCard title="サイズマスタ" desc="定型仕上がりサイズを登録します。" href="/masters/sizes" label="管理する" outline />
            <HomeCard title="品種マスタ" desc="チラシ・名刺など製品カテゴリを管理します。" href="/masters/categories" label="管理する" outline />
            <HomeCard title="仕様マスタ" desc="よく使う仕様をテンプレートとして登録します。" href="/masters/spec-templates" label="管理する" outline />
            <HomeCard title="加工単価" desc="各加工工程の料金を管理します。" href="/masters/processings" label="管理する" outline />
            <HomeCard title="工程日数" desc="納期計算用の工程別日数を管理します。" href="/masters/production-days" label="管理する" outline />
            <HomeCard title="祝日・休業日" desc="営業日計算から除外する日を管理します。" href="/masters/holidays" label="管理する" outline
            />
          </div>
        </section>
      )}

      {/* その他 */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">その他</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <HomeCard
            title="顧客管理"
            desc="顧客情報を管理します。"
            href="/customers"
            label="開く"
            outline
          />
          {isAdmin && (
            <HomeCard
              title="ユーザー管理"
              desc="システムユーザーを管理します。"
              href="/admin/users"
              label="管理する"
              outline
            />
          )}
        </div>
      </section>
    </div>
  );
}

function HomeCard({
  title, desc, href, label, outline = false,
}: {
  title: string;
  desc: string;
  href: string;
  label: string;
  outline?: boolean;
}) {
  return (
    <div className="bg-white border rounded-xl p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div>
        <p className="font-semibold text-gray-900">{title}</p>
        <p className="text-sm text-gray-500 mt-1">{desc}</p>
      </div>
      <Link href={href} className="mt-auto">
        <Button variant={outline ? 'outline' : 'default'} className="w-full">
          {label}
        </Button>
      </Link>
    </div>
  );
}
