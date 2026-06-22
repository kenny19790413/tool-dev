'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface Props {
  name: string;
  role: string;
}

export function UserMenu({ name, role }: Props) {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-blue-200">
        {name}
        <span className="ml-1.5 text-xs opacity-70">
          {role === 'admin' ? '（管理者）' : '（担当者）'}
        </span>
      </span>
      <Button
        size="sm"
        variant="ghost"
        className="text-blue-200 hover:text-white hover:bg-blue-600 h-7 px-2 text-xs"
        onClick={handleLogout}
      >
        ログアウト
      </Button>
    </div>
  );
}
