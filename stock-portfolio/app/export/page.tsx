'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

export default function ExportPage() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/export/tax-summary?year=${year}`);
      if (!res.ok) throw new Error('ダウンロードに失敗しました');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tax-summary-${year}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">データのエクスポート</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">確定申告向けCSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500">
            指定した年に受け取った配当・分配金の実績（税引後目安付き）と、参考情報として現在の評価額・含み損益をCSVで出力します。含み損益は未実現のため課税対象ではない旨を注記しています。
          </p>
          <div className="flex items-end gap-3">
            <div>
              <label className="text-sm text-gray-600 block mb-1">対象年</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="h-9 rounded-md border border-gray-300 px-2 text-sm"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}年
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={handleDownload} disabled={downloading}>
              {downloading ? '準備中…' : 'CSVをダウンロード'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
