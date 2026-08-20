'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface NewsItem {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
}

export function MarketNewsCard() {
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/market-news')
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setItems(data.items);
      })
      .catch(() => setError('市況ニュースの取得に失敗しました'));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">市況ニュース</CardTitle>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-gray-400">{error}</p>}
        {!error && items === null && <p className="text-sm text-gray-400">読み込み中…</p>}
        {!error && items && items.length > 0 && (
          <ul className="space-y-2 max-h-80 overflow-y-auto">
            {items.map((item, i) => (
              <li key={i} className="text-sm">
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">
                  {item.title}
                </a>
                <span className="text-xs text-gray-400 ml-2">
                  {item.source} ・ {new Date(item.publishedAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
