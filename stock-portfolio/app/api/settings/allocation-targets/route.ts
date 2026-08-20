import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import type { AssetType } from '@prisma/client';

const ASSET_TYPES: AssetType[] = ['STOCK', 'BOND', 'FUND', 'PRIVATE'];

export async function GET() {
  const targets = await prisma.allocationTarget.findMany();
  return NextResponse.json({
    targets: targets.map((t) => ({ assetType: t.assetType, targetPercent: Number(t.targetPercent) })),
  });
}

// 資産クラスごとの目標配分をまとめて保存する。0以下または未指定の資産クラスは目標なし（削除）として扱う。
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const entries = Object.entries(body.targets ?? {}) as [string, unknown][];

    await prisma.$transaction(
      ASSET_TYPES.map((assetType) => {
        const raw = entries.find(([k]) => k === assetType)?.[1];
        const percent = raw === undefined || raw === '' ? null : Number(raw);
        if (percent === null || !Number.isFinite(percent) || percent <= 0) {
          return prisma.allocationTarget.deleteMany({ where: { assetType } });
        }
        return prisma.allocationTarget.upsert({
          where: { assetType },
          update: { targetPercent: percent },
          create: { assetType, targetPercent: percent },
        });
      })
    );

    const targets = await prisma.allocationTarget.findMany();
    return NextResponse.json({
      targets: targets.map((t) => ({ assetType: t.assetType, targetPercent: Number(t.targetPercent) })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '保存に失敗しました' }, { status: 500 });
  }
}
