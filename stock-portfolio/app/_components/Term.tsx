'use client';

import { useEffect, useRef, useState } from 'react';
import { findGlossaryEntry } from '@/lib/glossary';

interface Props {
  slug: string;
  children: React.ReactNode;
}

// 専門用語に「？」アイコンを添え、タップ/クリックで簡単な解説をポップオーバー表示する。
// ホバー前提にしない（スマホでも使えるように）。外部クリックで閉じる。
export function Term({ slug, children }: Props) {
  const entry = findGlossaryEntry(slug);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  if (!entry) return <>{children}</>;

  return (
    <span ref={ref} className="relative inline-block">
      {children}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`${entry.term}の説明を見る`}
        className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-200 text-[10px] leading-none text-gray-600 align-super hover:bg-gray-300"
      >
        ?
      </button>
      {open && (
        <span className="absolute z-20 top-full left-0 mt-1 w-64 rounded-md border bg-white p-3 text-xs font-normal leading-relaxed text-gray-600 shadow-lg">
          <span className="block font-medium text-gray-800 mb-1">{entry.term}</span>
          {entry.definition}
        </span>
      )}
    </span>
  );
}
