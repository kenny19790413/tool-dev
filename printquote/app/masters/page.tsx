import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getSession } from '@/lib/auth';

const MASTERS = [
  { href: '/masters/papers',          label: '用紙マスタ',    desc: '用紙種類・連量・単価を管理します。', icon: '📄' },
  { href: '/masters/sizes',           label: 'サイズマスタ',  desc: '定型仕上がりサイズを登録します。',   icon: '📐' },
  { href: '/masters/categories',      label: '品種マスタ',    desc: 'チラシ・名刺などカテゴリを管理します。', icon: '🗂' },
  { href: '/masters/spec-templates',  label: '仕様マスタ',    desc: 'よく使う仕様をテンプレート登録します。', icon: '📋' },
  { href: '/masters/processings',     label: '加工単価',      desc: '各加工工程の料金を管理します。',      icon: '⚙️' },
  { href: '/masters/production-days', label: '工程日数',      desc: '納期計算用の工程別日数を管理します。', icon: '📅' },
  { href: '/masters/holidays',        label: '祝日・休業日',  desc: '営業日計算から除外する日を管理します。', icon: '🗓' },
];

export default async function MastersPage() {
  const session = await getSession();
  const isAdmin = session?.role === 'admin';

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">マスタ管理</h1>
        <p className="text-gray-500 mt-1 text-sm">システムで使用するマスタデータを管理します。</p>
      </div>

      {/* マスタ一覧（adminのみ） */}
      {isAdmin && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">マスタデータ</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MASTERS.map(({ href, label, desc, icon }) => (
              <MasterCard key={href} href={href} label={label} desc={desc} icon={icon} />
            ))}
          </div>
        </section>
      )}

      {/* 顧客管理 */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">顧客・ユーザー</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MasterCard
            href="/customers"
            label="顧客管理"
            desc="顧客情報（名前・連絡先・住所）を管理します。"
            icon="🏢"
          />
          {isAdmin && (
            <MasterCard
              href="/admin/users"
              label="ユーザー管理"
              desc="システムにログインできるユーザーを管理します。"
              icon="👤"
            />
          )}
        </div>
      </section>
    </div>
  );
}

function MasterCard({
  href, label, desc, icon,
}: {
  href: string;
  label: string;
  desc: string;
  icon: string;
}) {
  return (
    <div className="bg-white border rounded-xl p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="font-semibold text-gray-900 text-sm">{label}</p>
          <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
        </div>
      </div>
      <Link href={href} className="mt-auto">
        <Button variant="outline" size="sm" className="w-full">開く</Button>
      </Link>
    </div>
  );
}
