import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { parseOkasanCsv, buildImportGroups } from '@/lib/stock/csvImport';
import { isHoldingsCsv, parseOkasanHoldingsCsv, buildHoldingsImportItems } from '@/lib/stock/csvHoldings';
import { toNumber } from '@/lib/portfolio';

const MAX_CSV_BYTES = 2 * 1024 * 1024;

// UTF-8として妥当か確認し、ダメならShift-JIS（岡三証券・みずほ証券含む多くの証券会社CSVで使われる）としてデコードする
function decodeCsv(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('shift_jis').decode(buffer);
  }
}

interface ClientAsset {
  id: number;
  name: string;
  type: string;
  currency: string;
  quantity: number | null;
  avgCost: number | null;
  annualDistribution: number | null;
  distributionMonths: number[];
}

async function loadClientAssets(ids: number[]): Promise<ClientAsset[]> {
  const assets = await prisma.asset.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      type: true,
      currency: true,
      quantity: true,
      avgCost: true,
      annualDistribution: true,
      distributionMonths: true,
    },
  });
  return assets.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    currency: a.currency,
    quantity: a.quantity === null ? null : toNumber(a.quantity),
    avgCost: a.avgCost === null ? null : toNumber(a.avgCost),
    annualDistribution: a.annualDistribution === null ? null : toNumber(a.annualDistribution),
    distributionMonths: a.distributionMonths,
  }));
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'CSVファイルを選択してください' }, { status: 400 });
    }
    if (file.size > MAX_CSV_BYTES) {
      return NextResponse.json({ error: 'ファイルサイズが大きすぎます（2MB以下にしてください）' }, { status: 400 });
    }

    const text = decodeCsv(await file.arrayBuffer());
    const assets = await prisma.asset.findMany({ select: { id: true, name: true, type: true } });

    if (isHoldingsCsv(text)) {
      const rows = parseOkasanHoldingsCsv(text);
      const items = buildHoldingsImportItems(rows, assets);
      if (items.length === 0) {
        return NextResponse.json({ error: 'このCSVから保有銘柄を読み取れませんでした' }, { status: 422 });
      }
      const matchedIds = items.map((it) => it.matched?.id).filter((id): id is number => id != null);
      const clientAssets = await loadClientAssets(matchedIds);
      return NextResponse.json({ kind: 'holdings', items, assets: clientAssets });
    }

    const transactions = parseOkasanCsv(text);
    const groups = buildImportGroups(transactions, assets);
    if (groups.length === 0) {
      return NextResponse.json(
        { error: 'このCSVから反映できる分配金・購入の取引が見つかりませんでした' },
        { status: 422 }
      );
    }
    const matchedIds = groups.map((g) => g.matched?.id).filter((id): id is number => id != null);
    const clientAssets = await loadClientAssets(matchedIds);
    return NextResponse.json({ kind: 'transaction', groups, assets: clientAssets });
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : 'CSVの解析に失敗しました';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
