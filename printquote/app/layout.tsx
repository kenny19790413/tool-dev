import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import Link from 'next/link';
import { Toaster } from '@/components/ui/sonner';
import { getSession } from '@/lib/auth';
import { UserMenu } from './_components/UserMenu';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });

export const metadata: Metadata = {
  title: 'PrintQuote — 印刷見積もりシステム',
  description: '岡文館印刷所 印刷見積もり管理システム',
};

const navItems = [
  { href: '/estimates',           label: '見積もり一覧', adminOnly: false },
  { href: '/estimates/new',       label: '新規見積もり', adminOnly: false },
  { href: '/masters/papers',          label: '用紙マスタ', adminOnly: true  },
  { href: '/masters/processings',     label: '加工単価',   adminOnly: true  },
  { href: '/masters/production-days', label: '工程日数',   adminOnly: true  },
  { href: '/masters/holidays',        label: '祝日・休業日', adminOnly: true  },
  { href: '/customers',           label: '顧客管理',     adminOnly: false },
  { href: '/admin/users',         label: 'ユーザー管理', adminOnly: true  },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <html lang="ja" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-50">
        {/* ヘッダー */}
        <header className="bg-blue-700 text-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold tracking-tight">
              PrintQuote
            </Link>
            <div className="flex items-center gap-6">
              {session && (
                <nav className="flex gap-6 text-sm font-medium">
                  {navItems
                    .filter((item) => !item.adminOnly || session.role === 'admin')
                    .map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="hover:text-blue-200 transition-colors"
                      >
                        {item.label}
                      </Link>
                    ))}
                </nav>
              )}
              {session && <UserMenu name={session.name} role={session.role} />}
            </div>
          </div>
        </header>

        {/* メインコンテンツ */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
          {children}
        </main>

        {/* フッター */}
        <footer className="bg-gray-100 border-t text-center text-xs text-gray-400 py-3">
          © 岡文館印刷所 — PrintQuote v1.0
        </footer>

        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
