import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { calcAssetValueJpy, calcAssetGainJpy, DIVIDEND_TAX_RATE, type AssetWithValuations } from '@/lib/portfolio';

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csvRow(cells: (string | number)[]): string {
  return cells.map(csvCell).join(',') + '\r\n';
}

export async function GET(req: NextRequest) {
  const yearParam = req.nextUrl.searchParams.get('year');
  const year = yearParam ? Number(yearParam) : new Date().getFullYear();
  if (!Number.isInteger(year)) {
    return NextResponse.json({ error: '年を正しく指定してください' }, { status: 400 });
  }

  const since = new Date(Date.UTC(year, 0, 1));
  const until = new Date(Date.UTC(year + 1, 0, 1));

  const [receipts, assets, latestRate] = await Promise.all([
    prisma.distributionReceipt.findMany({
      where: { receivedAt: { gte: since, lt: until } },
      include: { asset: true },
      orderBy: { receivedAt: 'asc' },
    }),
    prisma.asset.findMany({ include: { valuations: { orderBy: { valuedAt: 'desc' }, take: 1 } } }),
    prisma.exchangeRate.findFirst({ where: { pair: 'USDJPY' }, orderBy: { fetchedAt: 'desc' } }),
  ]);
  const usdJpyRate = latestRate ? Number(latestRate.rate) : 150;

  let csv = '﻿'; // Excelでの文字化け防止のBOM
  csv += `確定申告用データ（${year}年）\r\n\r\n`;

  csv += '【配当・分配金の受取実績】\r\n';
  csv += csvRow(['受取日', '資産名', '証券会社', '受取額', '通貨', `税引後目安(源泉徴収${(DIVIDEND_TAX_RATE * 100).toFixed(3)}%)`, 'メモ']);
  let totalJpy = 0;
  for (const r of receipts) {
    const amount = Number(r.amount);
    const afterTax = amount * (1 - DIVIDEND_TAX_RATE);
    const amountJpy = r.asset.currency === 'USD' ? amount * usdJpyRate : amount;
    totalJpy += amountJpy;
    csv += csvRow([
      r.receivedAt.toISOString().slice(0, 10),
      r.asset.name,
      r.asset.broker ?? '',
      amount,
      r.asset.currency,
      Math.round(afterTax * 100) / 100,
      r.note ?? '',
    ]);
  }
  csv += csvRow(['', '', '', '', '', '', '']);
  csv += csvRow(['年間合計（JPY換算・現在レートで概算）', '', '', '', '', Math.round(totalJpy), '']);
  csv += '\r\n';

  csv += '【参考：エクスポート時点の評価額・含み損益スナップショット】\r\n';
  csv += csvRow(['資産名', '証券会社', '評価額(JPY)', '含み損益(JPY)', '取得単価']);
  const typedAssets = assets as unknown as AssetWithValuations[];
  for (const a of typedAssets) {
    const value = calcAssetValueJpy(a, usdJpyRate);
    const gain = calcAssetGainJpy(a, usdJpyRate);
    csv += csvRow([
      a.name,
      a.broker ?? '',
      Math.round(value),
      gain !== null ? Math.round(gain) : '未入力',
      a.avgCost !== null ? Number(a.avgCost) : '未入力',
    ]);
  }
  csv += '\r\n';
  csv +=
    '※ 含み損益は未実現のため課税対象ではありません。実際の譲渡所得は売却時の実績（証券会社発行の年間取引報告書等）に基づき別途ご確認ください。\r\n';
  csv += '※ 外貨建て配当・分配金のJPY換算は、データ出力時点の為替レートによる概算です。正確な申告には受取日時点のレートをご確認ください。\r\n';

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="tax-summary-${year}.csv"`,
    },
  });
}
