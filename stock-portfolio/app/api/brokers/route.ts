import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';

export async function GET() {
  const rows = await prisma.asset.findMany({
    where: { broker: { not: null } },
    select: { broker: true },
    distinct: ['broker'],
  });
  const brokers = rows
    .map((r) => r.broker)
    .filter((b): b is string => !!b && b.trim().length > 0)
    .sort((a, b) => a.localeCompare(b, 'ja'));
  return NextResponse.json({ brokers });
}
