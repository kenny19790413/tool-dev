import { neon } from '@neondatabase/serverless';
import { HolidaysTable } from './_components/HolidaysTable';

const sql = neon(process.env.DATABASE_URL!);

export default async function HolidaysPage() {
  const rows = await sql`SELECT * FROM holidays ORDER BY date`;
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold">祝日・休業日マスタ</h1>
        <p className="text-sm text-gray-500 mt-1">納期計算時に営業日から除外される日付を管理します。</p>
      </div>
      <HolidaysTable initial={rows as { id: number; date: string; name: string; type: 'public' | 'company' }[]} />
    </div>
  );
}
