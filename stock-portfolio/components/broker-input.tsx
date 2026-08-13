'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';

// 一覧取得APIの結果をコンポーネント間でキャッシュし、同一ページ内での再フェッチを避ける
let cachedBrokers: string[] | null = null;

export function BrokerInput({
  id,
  value,
  onChange,
  placeholder,
  className,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [brokers, setBrokers] = useState<string[]>(cachedBrokers ?? []);

  useEffect(() => {
    if (cachedBrokers) return;
    fetch('/api/brokers')
      .then((r) => r.json())
      .then((d) => {
        cachedBrokers = d.brokers ?? [];
        setBrokers(cachedBrokers ?? []);
      })
      .catch(() => {});
  }, []);

  const listId = `${id}-broker-list`;

  return (
    <>
      <Input
        id={id}
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? '例: SBI証券 / 楽天証券'}
        className={className}
        autoComplete="off"
      />
      <datalist id={listId}>
        {brokers.map((b) => (
          <option key={b} value={b} />
        ))}
      </datalist>
    </>
  );
}
