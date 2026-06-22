'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import { Input } from '@/components/ui/input';

const STATUS_OPTIONS = [
  { value: '', label: 'すべて' },
  { value: 'draft', label: '下書き' },
  { value: 'issued', label: '発行済み' },
  { value: 'approved', label: '承認済み' },
  { value: 'rejected', label: '却下' },
  { value: 'expired', label: '期限切れ' },
];

export function EstimateSearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="flex flex-wrap gap-3 items-center bg-white border rounded-lg px-4 py-3">
      <Input
        placeholder="件名・顧客名で検索…"
        defaultValue={searchParams.get('q') ?? ''}
        onChange={(e) => update('q', e.target.value)}
        className="w-56 h-8 text-sm"
      />
      <select
        defaultValue={searchParams.get('status') ?? ''}
        onChange={(e) => update('status', e.target.value)}
        className="h-8 text-sm border rounded-md px-2 bg-white"
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {(searchParams.get('q') || searchParams.get('status')) && (
        <button
          onClick={() => {
            router.replace(pathname);
          }}
          className="text-xs text-gray-400 hover:text-gray-600 underline"
        >
          クリア
        </button>
      )}
    </div>
  );
}
