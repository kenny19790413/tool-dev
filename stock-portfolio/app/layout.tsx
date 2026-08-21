import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import Link from 'next/link';
import { Toaster } from '@/components/ui/sonner';
import { getSession } from '@/lib/auth';
import { UserMenu } from './_components/UserMenu';
import { DisplayModeToggle } from './_components/DisplayModeToggle';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });

export const metadata: Metadata = {
  title: '資産管理 — Stock Portfolio',
  description: '保有資産（株・債券・ファンド・プライベート資産）と配当の一元管理',
};

const navItems = [
  { href: '/', label: 'ダッシュボード' },
  { href: '/assets', label: '資産一覧' },
  { href: '/assets/new', label: '資産を追加' },
  { href: '/simulator', label: 'シミュレーション' },
  { href: '/export', label: 'エクスポート' },
  { href: '/glossary', label: '用語集' },
  { href: '/settings', label: '設定' },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <html lang="ja" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-50">
        <header className="bg-blue-700 text-white shadow-md">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
            <Link href="/" className="text-xl font-bold tracking-tight">
              資産管理
            </Link>
            {session && (
              <div className="flex items-center gap-4 flex-wrap">
                <nav className="flex gap-5 text-sm font-medium items-center">
                  {navItems.map((item) => (
                    <Link key={item.href} href={item.href} className="hover:text-blue-200 transition-colors">
                      {item.label}
                    </Link>
                  ))}
                </nav>
                <DisplayModeToggle />
                <UserMenu />
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">{children}</main>

        <footer className="bg-gray-100 border-t text-center text-xs text-gray-400 py-3">
          Stock Portfolio — 個人用資産管理システム
        </footer>

        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
