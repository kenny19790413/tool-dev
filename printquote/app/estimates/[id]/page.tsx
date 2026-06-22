import { neon } from '@neondatabase/serverless';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { StatusChanger } from './_components/StatusChanger';
import { ComparePanel } from './_components/ComparePanel';
import { RecalcButton } from './_components/RecalcButton';

const sql = neon(process.env.DATABASE_URL!);

// ── 型定義 ─────────────────────────────────────────────────────

type EstimateStatus = 'draft' | 'issued' | 'approved' | 'rejected' | 'expired';

interface QuantityRow {
  id: number;
  quantity: number;
  actual_sheets: number;
  waste_sheets: number;
  total_sheets: number;
  passes: number;
  paper_cost: number;
  plate_cost: number;
  print_cost: number;
  ink_cost: number;
  cutting_cost: number;
  press_cost: number;
  pp_cost: number;
  emboss_cost: number;
  foil_cost: number;
  lamination_cost: number;
  corrugated_cost: number;
  thomson_cost: number;
  binding_cost: number;
  packing_cost: number;
  delivery_cost: number;
  outsource_cost: number;
  subtotal: number;
  overhead_amount: number;
  total: number;
  unit_price: number;
}

interface EstimateItem {
  id: number;
  item_name: string;
  finish_width_mm: number;
  finish_height_mm: number;
  front_colors: number;
  back_colors: number;
  faces: number;
  cuts: number;
  coater: string;
  color_type: string;
  waste_rate: number;
  paper_name: string | null;
  sort_order: number;
  process_types: string[];
  quantities: QuantityRow[];
}

// ── 定数 ───────────────────────────────────────────────────────

const STATUS_LABEL: Record<EstimateStatus, string> = {
  draft: '下書き', issued: '発行済み', approved: '承認済み',
  rejected: '却下', expired: '期限切れ',
};

const STATUS_COLOR: Record<EstimateStatus, string> = {
  draft:    'bg-gray-100 text-gray-800',
  issued:   'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  expired:  'bg-orange-100 text-orange-800',
};

const PROCESS_LABEL: Record<string, string> = {
  cutting: '断裁', pp: 'PP', press: 'プレス', emboss: 'エンボス',
  foil: '箔押し', lamination: '合紙', corrugated: '片段', thomson: 'トムソン',
  packing: '梱包', binding: '製本', delivery: '納品', other: 'その他',
};

const COATER_LABEL: Record<string, string> = { none: 'なし', single: '片面', double: '両面' };

const fmt = (n: number) => Math.round(Number(n)).toLocaleString('ja-JP');
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

// ── ページ（Server Component） ──────────────────────────────────

export default async function EstimateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // 見積もり + 明細 + 数量結果を並列取得
  const [[estimate], items] = await Promise.all([
    sql`
      SELECT e.*, u.name AS assigned_to_name
      FROM estimates e
      LEFT JOIN users u ON e.assigned_to = u.id
      WHERE e.id = ${Number(id)}
    `,
    sql`
      SELECT ei.*,
        COALESCE(
          array_agg(ep.process_type::text ORDER BY ep.sort_order)
          FILTER (WHERE ep.process_type IS NOT NULL),
          ARRAY[]::text[]
        ) AS process_types
      FROM estimate_items ei
      LEFT JOIN estimate_processings ep ON ep.estimate_item_id = ei.id
      WHERE ei.estimate_id = ${Number(id)}
      GROUP BY ei.id
      ORDER BY ei.sort_order, ei.id
    `,
  ]);

  if (!estimate) notFound();

  const itemIds = items.map((i: Record<string, unknown>) => Number(i.id));
  const quantities =
    itemIds.length > 0
      ? await sql`
          SELECT * FROM estimate_quantities
          WHERE estimate_item_id = ANY(${itemIds})
          ORDER BY estimate_item_id, quantity
        `
      : [];

  const itemsWithData: EstimateItem[] = items.map((item: Record<string, unknown>) => ({
    ...(item as unknown as EstimateItem),
    process_types: (item.process_types as string[]) ?? [],
    quantities: quantities.filter(
      (q: Record<string, unknown>) => Number(q.estimate_item_id) === Number(item.id)
    ) as unknown as QuantityRow[],
  }));

  const status = String(estimate.status) as EstimateStatus;
  const overheadRate = Number(estimate.overhead_rate);

  // ── レンダリング ─────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-5xl">

      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-sm text-gray-500 font-mono">
              {String(estimate.estimate_number)}
            </span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[status]}`}>
              {STATUS_LABEL[status]}
            </span>
          </div>
          <h1 className="text-2xl font-bold">{String(estimate.title)}</h1>
          <p className="text-sm text-gray-500 mt-1">{String(estimate.customer_name)}</p>
        </div>
        <div className="flex gap-2">
          <a href={`/estimates/${id}/pdf`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline">📄 PDF出力</Button>
          </a>
          <Link href="/estimates">
            <Button variant="outline">← 一覧</Button>
          </Link>
        </div>
      </div>

      {/* 基本情報カード */}
      <Card>
        <CardHeader><CardTitle className="text-base">基本情報</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4 text-sm">
            <div>
              <dt className="text-gray-500 mb-0.5">製品種別</dt>
              <dd className="font-medium">
                {String(estimate.product_type) === 'thick' ? '厚物' : '薄物'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 mb-0.5">カテゴリ</dt>
              <dd className="font-medium">{String(estimate.category)}</dd>
            </div>
            <div>
              <dt className="text-gray-500 mb-0.5">営業経費率</dt>
              <dd className="font-medium">{overheadRate}%</dd>
            </div>
            {estimate.valid_until && (
              <div>
                <dt className="text-gray-500 mb-0.5">有効期限</dt>
                <dd className="font-medium">{fmtDate(String(estimate.valid_until))}</dd>
              </div>
            )}
            <div>
              <dt className="text-gray-500 mb-0.5">作成日</dt>
              <dd className="font-medium">{fmtDate(String(estimate.created_at))}</dd>
            </div>
            {estimate.note && (
              <div className="col-span-2 md:col-span-3">
                <dt className="text-gray-500 mb-0.5">備考</dt>
                <dd className="font-medium">{String(estimate.note)}</dd>
              </div>
            )}
          </dl>

          {/* ステータス変更（Client Component） */}
          <StatusChanger estimateId={Number(estimate.id)} currentStatus={status} />
        </CardContent>
      </Card>

      {/* 明細セクション */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">明細・仕様</CardTitle>
            <Link href={`/estimates/${id}/items/new`}>
              <Button size="sm">+ 明細を追加</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {itemsWithData.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-sm">まだ明細がありません</p>
              <p className="text-xs mt-1">「明細を追加」から用紙・印刷仕様を入力してください</p>
            </div>
          ) : (
            <div className="space-y-8">
              {itemsWithData.map((item) => (
                <ItemSection
                  key={item.id}
                  item={item}
                  estimateId={Number(estimate.id)}
                  overheadRate={overheadRate}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── 明細セクション ─────────────────────────────────────────────

function ItemSection({
  item,
  estimateId,
  overheadRate,
}: {
  item: EstimateItem;
  estimateId: number;
  overheadRate: number;
}) {
  const processingTotal = (q: QuantityRow) =>
    Number(q.cutting_cost) + Number(q.press_cost) + Number(q.pp_cost) +
    Number(q.emboss_cost) + Number(q.foil_cost) + Number(q.lamination_cost) +
    Number(q.corrugated_cost) + Number(q.thomson_cost) + Number(q.binding_cost) +
    Number(q.packing_cost) + Number(q.delivery_cost) + Number(q.outsource_cost);

  return (
    <div className="space-y-3">
      {/* 仕様ヘッダー */}
      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="font-semibold text-sm">{item.item_name}</p>
          <RecalcButton
            estimateId={estimateId}
            itemId={item.id}
            defaultQuantities={item.quantities.map((q) => Number(q.quantity))}
          />
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          仕上がり {Number(item.finish_width_mm)} × {Number(item.finish_height_mm)} mm
          ／ 用紙: {item.paper_name ?? '—'}
          ／ 表{Number(item.front_colors)}色 裏{Number(item.back_colors)}色
          ／ コーター: {COATER_LABEL[item.coater] ?? item.coater}
          ／ {Number(item.faces)}面{Number(item.cuts)}カット
          ／ ヤレ{Number(item.waste_rate)}%
        </p>
        {item.process_types.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {item.process_types.map((pt) => (
              <Badge key={pt} variant="secondary" className="text-xs">
                {PROCESS_LABEL[pt] ?? pt}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* 数量比較テーブル */}
      {item.quantities.length > 0 ? (
        <div className="overflow-x-auto rounded border">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 text-xs">
                <TableHead className="w-20">数量</TableHead>
                <TableHead className="text-right">用紙費</TableHead>
                <TableHead className="text-right">刷版費</TableHead>
                <TableHead className="text-right">印刷費</TableHead>
                <TableHead className="text-right">加工費計</TableHead>
                <TableHead className="text-right">小計</TableHead>
                <TableHead className="text-right">経費({overheadRate}%)</TableHead>
                <TableHead className="text-right font-bold">合計</TableHead>
                <TableHead className="text-right">単価</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {item.quantities
                .slice()
                .sort((a, b) => Number(a.quantity) - Number(b.quantity))
                .map((q) => (
                  <TableRow key={q.id} className="text-sm">
                    <TableCell className="font-medium">
                      {Number(q.quantity).toLocaleString()}部
                    </TableCell>
                    <TableCell className="text-right text-gray-700">
                      ¥{fmt(Number(q.paper_cost))}
                    </TableCell>
                    <TableCell className="text-right text-gray-700">
                      ¥{fmt(Number(q.plate_cost))}
                    </TableCell>
                    <TableCell className="text-right text-gray-700">
                      ¥{fmt(Number(q.print_cost) + Number(q.ink_cost))}
                    </TableCell>
                    <TableCell className="text-right text-gray-700">
                      ¥{fmt(processingTotal(q))}
                    </TableCell>
                    <TableCell className="text-right text-gray-700">
                      ¥{fmt(Number(q.subtotal))}
                    </TableCell>
                    <TableCell className="text-right text-gray-700">
                      ¥{fmt(Number(q.overhead_amount))}
                    </TableCell>
                    <TableCell className="text-right font-bold text-blue-700">
                      ¥{fmt(Number(q.total))}
                    </TableCell>
                    <TableCell className="text-right text-gray-700">
                      ¥{Number(q.unit_price).toFixed(1)}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-xs text-gray-400 italic">計算結果なし</p>
      )}

      {/* 比較分析パネル（2つ以上の数量がある場合のみ表示） */}
      <ComparePanel quantities={item.quantities} overheadRate={overheadRate} />
    </div>
  );
}
