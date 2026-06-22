'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

const MASTER_ITEMS = [
  { href: '/masters/papers',          label: '用紙マスタ' },
  { href: '/masters/sizes',           label: 'サイズマスタ' },
  { href: '/masters/categories',      label: '品種マスタ' },
  { href: '/masters/spec-templates',  label: '仕様マスタ' },
  { href: '/masters/processings',     label: '加工単価' },
  { href: '/masters/production-days', label: '工程日数' },
  { href: '/masters/holidays',        label: '祝日・休業日' },
];

export function MasterMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="hover:text-blue-200 transition-colors flex items-center gap-1"
      >
        マスタ管理
        <svg className="w-3 h-3 opacity-70" viewBox="0 0 12 12" fill="currentColor">
          <path d="M6 8L1 3h10z" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-7 bg-white text-gray-800 rounded-lg shadow-lg border min-w-40 z-50 py-1">
          {MASTER_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
