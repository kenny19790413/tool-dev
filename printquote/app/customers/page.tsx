import { neon } from '@neondatabase/serverless';
import { CustomersTable } from './_components/CustomersTable';

const sql = neon(process.env.DATABASE_URL!);

export default async function CustomersPage() {
  const customers = await sql`
    SELECT id, name, name_kana, contact_name, email, phone, address, note, is_active
    FROM customers
    ORDER BY name
  `;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">顧客管理</h1>
        <p className="text-sm text-gray-500 mt-1">{customers.length} 件登録</p>
      </div>
      <CustomersTable initial={customers as Parameters<typeof CustomersTable>[0]['initial']} />
    </div>
  );
}
