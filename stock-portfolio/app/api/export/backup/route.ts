import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';

// Decimal型を素の数値に変換する。Prisma DecimalはtoJSON()を持つため、JSON.stringifyのreplacerに
// 渡す前に自前で再帰変換しておく必要がある（replacerはtoJSON適用後の値しか受け取れないため）。
function deepConvertDecimals(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(deepConvertDecimals);
  if (typeof value === 'object') {
    if (typeof (value as { toNumber?: unknown }).toNumber === 'function') {
      return (value as { toNumber: () => number }).toNumber();
    }
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = deepConvertDecimals(v);
    }
    return result;
  }
  return value;
}

export async function GET() {
  // Credential（パスワードハッシュ）はセキュリティ上バックアップに含めない
  const [assets, portfolioSnapshots, exchangeRates, allocationTargets] = await Promise.all([
    prisma.asset.findMany({
      include: { valuations: { orderBy: { valuedAt: 'desc' } }, distributionReceipts: { orderBy: { receivedAt: 'desc' } } },
      orderBy: { id: 'asc' },
    }),
    prisma.portfolioSnapshot.findMany({ orderBy: { date: 'asc' } }),
    prisma.exchangeRate.findMany({ orderBy: { fetchedAt: 'asc' } }),
    prisma.allocationTarget.findMany(),
  ]);

  const backup = {
    exportedAt: new Date().toISOString(),
    schemaNote: 'StockPortfolioの全データバックアップ（Credential/パスワードハッシュは含みません）',
    assets,
    portfolioSnapshots,
    exchangeRates,
    allocationTargets,
  };

  const json = JSON.stringify(deepConvertDecimals(backup), null, 2);
  const filename = `stock-portfolio-backup-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(json, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
