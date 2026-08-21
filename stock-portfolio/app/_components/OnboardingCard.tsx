'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'sp_onboarding_dismissed';

export function OnboardingCard() {
  const [dismissed, setDismissed] = useState(true); // 初期表示ではSSRとの不一致を避けるため非表示にしておく

  useEffect(() => {
    setDismissed(localStorage.getItem(STORAGE_KEY) === '1');
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1');
    setDismissed(true);
  }

  if (dismissed) return null;

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="pt-4 space-y-2">
        <p className="text-sm font-medium text-blue-900">はじめての方へ</p>
        <ol className="text-sm text-blue-900 list-decimal list-inside space-y-0.5">
          <li>
            <Link href="/assets/new" className="underline">
              資産を追加
            </Link>
            で保有している株・投資信託などを登録します
          </li>
          <li>「株価を更新」ボタンで最新の評価額・含み損益を反映します</li>
          <li>
            見慣れない用語には「？」アイコンが付いています。まとめて見たい場合は
            <Link href="/glossary" className="underline">
              用語集
            </Link>
            もご利用ください
          </li>
          <li>
            画面右上の「表示: シンプル/詳細」で、集中リスクスコアなどの詳しい分析の表示を切り替えられます
          </li>
        </ol>
        <Button size="sm" variant="outline" onClick={dismiss}>
          閉じる
        </Button>
      </CardContent>
    </Card>
  );
}
