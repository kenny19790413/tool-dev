import { neon } from '@neondatabase/serverless';
import { notFound } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { UsersTable } from './_components/UsersTable';

const sql = neon(process.env.DATABASE_URL!);

export default async function UsersPage() {
  const session = await getSession();
  if (session?.role !== 'admin') notFound();

  const users = await sql`
    SELECT id, name, email, role, is_active, last_login_at, created_at
    FROM users ORDER BY created_at
  `;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">ユーザー管理</h1>
        <p className="text-sm text-gray-500 mt-1">{users.length} 件登録（管理者のみ表示）</p>
      </div>
      <UsersTable
        initial={users as Parameters<typeof UsersTable>[0]['initial']}
        currentUserId={session.sub}
      />
    </div>
  );
}
