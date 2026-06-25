import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function saveHistory(
  estimateId: number,
  changedById: number | null,
  changeNote: string
) {
  // 見積もり本体
  const [estimate] = await sql`SELECT * FROM estimates WHERE id = ${estimateId}`;
  if (!estimate) return;

  // 明細（加工種別を配列集約）
  const items = await sql`
    SELECT ei.*,
      COALESCE(
        array_agg(ep.process_type::text ORDER BY ep.sort_order)
        FILTER (WHERE ep.process_type IS NOT NULL),
        ARRAY[]::text[]
      ) AS process_types
    FROM estimate_items ei
    LEFT JOIN estimate_processings ep ON ep.estimate_item_id = ei.id
    WHERE ei.estimate_id = ${estimateId}
    GROUP BY ei.id
    ORDER BY ei.sort_order
  `;

  // 数量計算結果
  const itemIds = items.map((i: Record<string, unknown>) => Number(i.id));
  const quantities =
    itemIds.length > 0
      ? await sql`
          SELECT * FROM estimate_quantities
          WHERE estimate_item_id = ANY(${itemIds})
          ORDER BY estimate_item_id, quantity
        `
      : [];

  const snapshot = { estimate, items, quantities };

  // 現在の最大バージョンを取得
  const [{ max_version }] = await sql`
    SELECT COALESCE(MAX(version), 0) AS max_version
    FROM estimate_histories
    WHERE estimate_id = ${estimateId}
  `;

  await sql`
    INSERT INTO estimate_histories
      (estimate_id, version, snapshot_json, changed_by, change_note)
    VALUES (
      ${estimateId},
      ${Number(max_version) + 1},
      ${JSON.stringify(snapshot)},
      ${changedById},
      ${changeNote}
    )
  `;
}
