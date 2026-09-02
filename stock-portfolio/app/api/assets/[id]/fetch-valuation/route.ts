import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { fetchPublicPageValuation } from '@/lib/stock/valuationPage';

interface Params {
  params: Promise<{ id: string }>;
}

// 評価額を自動取得し、DBには保存せず結果を返すだけ（金額はユーザーが確認して手動で「評価額を追加」する）。
// 抽出は正規表現によるベストエフォートのため、必ずユーザーの目視確認を挟む設計にしている。
export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const asset = await prisma.asset.findUnique({ where: { id: Number(id) } });
  if (!asset) return NextResponse.json({ error: '資産が見つかりません' }, { status: 404 });
  if (!asset.valuationUrl) {
    return NextResponse.json({ error: '評価額を確認できるページのURLが未設定です' }, { status: 400 });
  }

  try {
    const result = await fetchPublicPageValuation(asset.valuationUrl);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : '評価額の取得に失敗しました';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
