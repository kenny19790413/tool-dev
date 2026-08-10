import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const COOKIE = 'sp_token';
const EXPIRES_SEC = 60 * 60 * 24 * 30; // 30日（モバイルで頻繁に再ログインしなくて済むように長め）

function secret() {
  return new TextEncoder().encode(process.env.JWT_SECRET ?? 'dev-secret');
}

export interface JwtPayload {
  sub: 'owner';
}

export async function signToken(): Promise<string> {
  return new SignJWT({ sub: 'owner' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRES_SEC}s`)
    .sign(secret());
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<JwtPayload | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function cookieOptions(maxAge: number) {
  return {
    name: COOKIE,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}

export { COOKIE, EXPIRES_SEC };
