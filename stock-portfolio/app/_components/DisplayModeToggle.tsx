'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const COOKIE = 'sp_mode';

function readMode(): 'simple' | 'advanced' {
  if (typeof document === 'undefined') return 'simple';
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]*)`));
  return match?.[1] === 'advanced' ? 'advanced' : 'simple';
}

// ダッシュボードの表示モード（シンプル/詳細）を切り替える。cookieに保存し、サーバー側（page.tsx）で
// 表示するカードを出し分ける。デフォルトはシンプル。
export function DisplayModeToggle() {
  const router = useRouter();
  const [mode, setMode] = useState<'simple' | 'advanced'>('simple');

  useEffect(() => {
    setMode(readMode());
  }, []);

  function toggle() {
    const next = mode === 'simple' ? 'advanced' : 'simple';
    document.cookie = `${COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
    setMode(next);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="text-xs font-medium bg-blue-800 hover:bg-blue-900 text-white rounded-full px-3 py-1.5 transition-colors"
      title="ダッシュボードの表示モードを切り替えます"
    >
      表示: {mode === 'simple' ? 'シンプル' : '詳細'}
    </button>
  );
}
