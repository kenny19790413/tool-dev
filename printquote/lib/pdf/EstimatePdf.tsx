import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

// ── 型 ─────────────────────────────────────────────────────────

export interface PdfQuantityRow {
  quantity: number;
  unit_price: number | null;
  total: number;
}

export interface PdfItem {
  item_name: string;
  quantities: PdfQuantityRow[];
}

export interface EstimatePdfData {
  estimate_number: string;
  customer_name: string;
  assigned_to_name: string | null;
  created_at: string;
  valid_until: string | null;
  note: string | null;
  items: PdfItem[];
}

// ── 日本語フォント登録（プロジェクト内フォント） ──
Font.register({
  family: 'NotoSansJP',
  src: process.cwd() + '/public/fonts/NotoSansJP-VF.ttf',
});

// ── スタイル ────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: 'NotoSansJP',
    fontSize: 10,
    paddingTop: 30,
    paddingBottom: 30,
    paddingHorizontal: 36,
    color: '#000',
  },
  // ヘッダー
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 8,
    flex: 1,
  },
  dateLabel: {
    fontSize: 9,
    textAlign: 'right',
    width: 100,
  },
  // 宛先・条件エリア
  addressBlock: {
    marginTop: 8,
    marginBottom: 4,
  },
  companyName: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  honorific: {
    fontSize: 10,
    marginTop: 2,
  },
  condRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  condLeft: {
    flex: 1,
  },
  condLabel: {
    fontSize: 9,
    marginTop: 3,
  },
  condValue: {
    fontSize: 9,
    marginTop: 3,
    fontWeight: 'bold',
  },
  staffLabel: {
    fontSize: 9,
    textAlign: 'right',
    marginTop: 3,
  },
  // 挨拶文
  greeting: {
    marginTop: 8,
    marginBottom: 6,
    fontSize: 9,
    lineHeight: 1.8,
  },
  // テーブル
  table: {
    borderTopWidth: 1,
    borderTopColor: '#000',
    borderTopStyle: 'solid',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    borderBottomStyle: 'solid',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
    borderBottomStyle: 'solid',
    minHeight: 20,
  },
  tableRowEmpty: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
    borderBottomStyle: 'solid',
    height: 18,
  },
  colName: {
    flex: 5,
    paddingHorizontal: 4,
    paddingVertical: 3,
    borderRightWidth: 0.5,
    borderRightColor: '#000',
    borderRightStyle: 'solid',
  },
  colQty: {
    width: 60,
    paddingHorizontal: 4,
    paddingVertical: 3,
    borderRightWidth: 0.5,
    borderRightColor: '#000',
    borderRightStyle: 'solid',
    textAlign: 'right',
  },
  colUnit: {
    width: 70,
    paddingHorizontal: 4,
    paddingVertical: 3,
    borderRightWidth: 0.5,
    borderRightColor: '#000',
    borderRightStyle: 'solid',
    textAlign: 'right',
  },
  colAmount: {
    width: 80,
    paddingHorizontal: 4,
    paddingVertical: 3,
    textAlign: 'right',
  },
  headerText: {
    fontWeight: 'bold',
    fontSize: 9,
    textAlign: 'center',
  },
  cellText: {
    fontSize: 9,
  },
  // 合計行
  totalRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#000',
    borderTopStyle: 'solid',
    marginTop: 2,
  },
  totalLabel: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 4,
    fontSize: 8,
    textAlign: 'right',
    color: '#555',
  },
  totalAmount: {
    width: 80,
    paddingHorizontal: 4,
    paddingVertical: 4,
    textAlign: 'right',
    fontWeight: 'bold',
    fontSize: 10,
    borderLeftWidth: 0.5,
    borderLeftColor: '#000',
    borderLeftStyle: 'solid',
  },
  // フッター
  footer: {
    marginTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: '#000',
    borderTopStyle: 'solid',
    paddingTop: 6,
  },
  footerLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  noteText: {
    fontSize: 8,
    color: '#333',
    marginBottom: 8,
    minHeight: 40,
  },
  companyInfo: {
    marginTop: 4,
    fontSize: 9,
    lineHeight: 1.6,
  },
});

// ── ユーティリティ ──────────────────────────────────────────────

const fmtYen = (n: number) =>
  '¥' + Math.round(n).toLocaleString('ja-JP');

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
};

const MAX_ROWS = 24;

// ── PDF文書コンポーネント ────────────────────────────────────────

export function EstimatePdf({ data }: { data: EstimatePdfData }) {
  // 品目を数量ごとの行に展開
  const rows: { name: string; qty: number; unit: number | null; amount: number }[] = [];
  for (const item of data.items) {
    for (const q of item.quantities) {
      rows.push({
        name: item.quantities.length > 1
          ? `${item.item_name}（${q.quantity.toLocaleString()}部）`
          : item.item_name,
        qty: q.quantity,
        unit: q.unit_price,
        amount: q.total,
      });
    }
  }

  // 合計
  const grandTotal = rows.reduce((sum, r) => sum + r.amount, 0);

  // 空行でMAX_ROWSまで埋める（1ページ超は次ページ）
  const pages: typeof rows[] = [];
  for (let i = 0; i < Math.max(1, Math.ceil(rows.length / MAX_ROWS)); i++) {
    pages.push(rows.slice(i * MAX_ROWS, (i + 1) * MAX_ROWS));
  }

  const createdAt = fmtDate(data.created_at);
  const validUntil = data.valid_until ? fmtDate(data.valid_until) : '—';
  const staffName = data.assigned_to_name ?? '岡部';

  return (
    <Document>
      {pages.map((pageRows, pageIdx) => {
        const emptyCount = MAX_ROWS - pageRows.length;
        const isLastPage = pageIdx === pages.length - 1;

        return (
          <Page key={pageIdx} size="A4" style={s.page}>
            {/* ── ヘッダー ── */}
            <View style={s.headerRow}>
              <Text style={s.title}>御　　見　　積　　書</Text>
              <Text style={s.dateLabel}>{createdAt}</Text>
            </View>

            {/* ── 宛先 ── */}
            <View style={s.addressBlock}>
              <Text style={s.companyName}>{data.customer_name}</Text>
              <Text style={s.honorific}>　御中</Text>
            </View>

            {/* ── 条件行 ── */}
            <View style={s.condRow}>
              <View style={s.condLeft}>
                <Text style={s.condLabel}>納　　期：</Text>
                <Text style={s.condLabel}>支払条件：</Text>
                <Text style={s.condLabel}>有効期限：{validUntil}</Text>
              </View>
              <Text style={s.staffLabel}>担当者：{staffName}</Text>
            </View>

            {/* ── 挨拶文 ── */}
            <View style={s.greeting}>
              <Text>下記の通りお見積り申し上げます。</Text>
              <Text>ご検討の上ご下命の程、よろしくお願い致します。</Text>
            </View>

            {/* ── 品目テーブル ── */}
            <View style={s.table}>
              {/* テーブルヘッダー */}
              <View style={s.tableHeaderRow}>
                <View style={s.colName}>
                  <Text style={s.headerText}>品　　　　名</Text>
                </View>
                <View style={s.colQty}>
                  <Text style={s.headerText}>数　量</Text>
                </View>
                <View style={s.colUnit}>
                  <Text style={s.headerText}>単　価</Text>
                </View>
                <View style={s.colAmount}>
                  <Text style={s.headerText}>金　額</Text>
                </View>
              </View>

              {/* データ行 */}
              {pageRows.map((row, i) => (
                <View key={i} style={s.tableRow}>
                  <View style={s.colName}>
                    <Text style={s.cellText}>{row.name}</Text>
                  </View>
                  <View style={s.colQty}>
                    <Text style={s.cellText}>{row.qty.toLocaleString()}</Text>
                  </View>
                  <View style={s.colUnit}>
                    <Text style={s.cellText}>
                      {row.unit != null ? fmtYen(row.unit) : ''}
                    </Text>
                  </View>
                  <View style={s.colAmount}>
                    <Text style={s.cellText}>{fmtYen(row.amount)}</Text>
                  </View>
                </View>
              ))}

              {/* 空行 */}
              {Array.from({ length: emptyCount }).map((_, i) => (
                <View key={`empty-${i}`} style={s.tableRowEmpty}>
                  <View style={s.colName}><Text> </Text></View>
                  <View style={s.colQty}><Text> </Text></View>
                  <View style={s.colUnit}><Text> </Text></View>
                  <View style={s.colAmount}><Text> </Text></View>
                </View>
              ))}
            </View>

            {/* ── 合計行（最終ページのみ） ── */}
            {isLastPage && (
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>消費税別</Text>
                <Text style={s.totalAmount}>{fmtYen(grandTotal)}</Text>
              </View>
            )}

            {/* ── フッター（最終ページのみ） ── */}
            {isLastPage && (
              <View style={s.footer}>
                <Text style={s.footerLabel}>内容明細・備考</Text>
                <Text style={s.noteText}>{data.note ?? ''}</Text>
                <View style={s.companyInfo}>
                  <Text>株式会社　岡文館印刷所</Text>
                  <Text>中国銀行　東岡山支店　当座　１２２９０</Text>
                </View>
              </View>
            )}
          </Page>
        );
      })}
    </Document>
  );
}
