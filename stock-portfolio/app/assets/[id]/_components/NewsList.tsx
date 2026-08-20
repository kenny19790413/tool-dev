'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface NewsItem {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
}

export function NewsList({ assetId }: { assetId: number }) {
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/assets/${assetId}/news`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) setError(data.error);
        else setItems(data.items);
      })
      .catch(() => {
        if (!cancelled) setError('ニュースの取得に失敗しました');
      });
    return () => {
      cancelled = true;
    };
  }, [assetId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">ニュース</CardTitle>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-gray-400">{error}</p>}
        {!error && items === null && <p className="text-sm text-gray-400">読み込み中…</p>}
        {!error && items?.length === 0 && (
          <p className="text-sm text-gray-400">開示情報が見つかりませんでした（東証上場銘柄のみ対応）</p>
        )}
        {!error && items && items.length > 0 && (
          <ul className="space-y-3">
            {items.map((item, i) => (
              <li key={i}>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 hover:underline font-medium"
                >
                  {item.title}
                </a>
                <p className="text-xs text-gray-400">
                  {item.source} ・ {new Date(item.publishedAt).toLocaleDateString('ja-JP')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
