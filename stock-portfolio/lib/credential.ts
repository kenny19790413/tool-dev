import bcrypt from 'bcryptjs';
import { prisma } from './db/client';

const SINGLETON_ID = 1;

// 初回アクセス時にAPP_PASSWORD(環境変数)からDBのパスワードレコードを作成する。
// 以降はDB側のパスワードのみが有効（設定画面から変更可能）。
async function getOrCreateCredential() {
  let cred = await prisma.credential.findUnique({ where: { id: SINGLETON_ID } });
  if (!cred) {
    const initial = process.env.APP_PASSWORD ?? 'changeme';
    const passwordHash = await bcrypt.hash(initial, 10);
    cred = await prisma.credential.create({ data: { id: SINGLETON_ID, passwordHash } });
  }
  return cred;
}

export async function verifyPassword(password: string): Promise<boolean> {
  const cred = await getOrCreateCredential();
  return bcrypt.compare(password, cred.passwordHash);
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const cred = await getOrCreateCredential();
  const valid = await bcrypt.compare(currentPassword, cred.passwordHash);
  if (!valid) return { ok: false, error: '現在のパスワードが違います' };
  if (newPassword.length < 4) return { ok: false, error: '新しいパスワードは4文字以上にしてください' };

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.credential.update({ where: { id: SINGLETON_ID }, data: { passwordHash } });
  return { ok: true };
}
