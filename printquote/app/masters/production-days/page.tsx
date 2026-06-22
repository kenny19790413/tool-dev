import { neon } from '@neondatabase/serverless';
import { ProductionDaysTable } from './_components/ProductionDaysTable';

const sql = neon(process.env.DATABASE_URL!);

const PROCESS_LABEL: Record<string, string> = {
  print: '印刷', cutting: '断裁', pp: 'PP加工', press: 'プレス',
  emboss: 'エンボス', foil: '箔押し', lamination: '合紙',
  corrugated: '片段合紙', thomson: 'トムソン', binding: '製本', packing: '梱包・納品',
};

export default async function ProductionDaysPage() {
  const rows = await sql`SELECT * FROM production_day_masters ORDER BY process_type, quantity_min`;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">工程別標準日数マスタ</h1>
        <p className="text-sm text-gray-500 mt-1">数量帯ごとの標準作業日数を設定します（納期計算に使用）</p>
      </div>
      <ProductionDaysTable
        initial={rows as Parameters<typeof ProductionDaysTable>[0]['initial']}
        processLabels={PROCESS_LABEL}
      />
    </div>
  );
}
