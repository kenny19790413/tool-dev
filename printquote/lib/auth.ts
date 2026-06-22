import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const COOKIE = 'pq_token';
const EXPIRES_SEC = 60 * 60 * 8; // 8時間

function secret() {
  return new TextEncoder().encode(process.env.JWT_SECRET ?? 'dev-secret');
}

export interface JwtPayload {
  sub: string;       // user id
  name: string;
  email: string;
  role: 'admin' | 'staff';
}

export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
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
    path: '/',
    maxAge,
  };
}

export { COOKIE, EXPIRES_SEC };
