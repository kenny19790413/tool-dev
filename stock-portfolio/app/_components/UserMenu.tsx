'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function UserMenu() {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <Button variant="ghost" size="sm" className="text-white hover:text-blue-200 hover:bg-blue-800" onClick={handleLogout}>
      ログアウト
    </Button>
  );
}
