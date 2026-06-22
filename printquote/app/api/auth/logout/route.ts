import { NextResponse } from 'next/server';
import { cookieOptions } from '@/lib/auth';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ ...cookieOptions(0), value: '' });
  return res;
}
