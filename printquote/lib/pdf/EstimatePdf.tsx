import React from 'react';
import {
  Document, Page, Text, View, StyleSheet, Font,
} from '@react-pdf/renderer';

// ── 型 ─────────────────────────────────────────────────────────

export interface PdfQuantityRow {
  quantity: number;
  unit_price: number | null;
  total: number;
}

export interface PdfItem {
  item_name: string;
  spec?: string;   // 仕様テキスト（用紙・サイズ・色数など）
  quantities: PdfQuantityRow[];
}

export interface EstimatePdfData {
  estimate_number: string;
  title: string;
  customer_name: string;
  assigned_to_name: string | null;
  created_at: string;
  valid_until: string | null;
  note: string | null;
  items: PdfItem[];
}

// ── フォント ────────────────────────────────────────────────────
Font.register({
  family: 'NotoSansJP',
  src: process.cwd() + '/public/fonts/NotoSansJP-VF.ttf',
});

// ── スタイル ────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: 'NotoSansJP',
    fontSize: 9,
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 36,
    color: '#000',
  },
  // タイトル行
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 6,
  },
  estimateNo: {
    fontSize: 8,
    textAlign: 'right',
    color: '#444',
  },
  // 宛先と差出人の2カラム
  headerGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#aaa',
    borderBottomStyle: 'solid',
    paddingBottom: 6,
  },
  headerLeft: { flex: 1 },
  headerRight: { width: 160, alignItems: 'flex-end' },
  customerName: { fontSize: 13, fontWeight: 'bold', marginBottom: 2 },
  honorific: { fontSize: 9 },
  condRow: { flexDirection: 'row', marginTop: 3 },
  condLabel: { fontSize: 8, color: '#555', width: 52 },
  condValue: { fontSize: 8 },
  companyBlock: { fontSize: 8, lineHeight: 1.6, textAlign: 'right' },
  // 件名・合計金額バー
  subjectBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 12,
  },
  subjectLabel: { fontSize: 8, color: '#555', width: 28 },
  subjectValue: { fontSize: 10, fontWeight: 'bold', flex: 1 },
  grandTotalBox: {
    borderWidth: 1,
    borderColor: '#000',
    borderStyle: 'solid',
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'flex-end',
    minWidth: 130,
  },
  grandTotalLabel: { fontSize: 7, color: '#555', marginBottom: 1 },
  grandTotalValue: { fontSize: 12, fontWeight: 'bold' },
  // 挨拶
  greeting: { fontSize: 8, marginBottom: 6, lineHeight: 1.7 },
  // テーブル
  table: {
    borderTopWidth: 1, borderTopColor: '#000', borderTopStyle: 'solid',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#e8e8e8',
    borderBottomWidth: 1, borderBottomColor: '#000', borderBottomStyle: 'solid',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5, borderBottomColor: '#ccc', borderBottomStyle: 'solid',
    minHeight: 18,
  },
  tableRowEmpty: {
    flexDirection: 'row',
    borderBottomWidth: 0.5, borderBottomColor: '#ccc', borderBottomStyle: 'solid',
    height: 16,
  },
  colName: {
    flex: 5, paddingHorizontal: 4, paddingVertical: 3,
    borderRightWidth: 0.5, borderRightColor: '#999', borderRightStyle: 'solid',
  },
  colQty: {
    width: 55, paddingHorizontal: 4, paddingVertical: 3,
    borderRightWidth: 0.5, borderRightColor: '#999', borderRightStyle: 'solid',
    textAlign: 'right',
  },
  colUnit: {
    width: 70, paddingHorizontal: 4, paddingVertical: 3,
    borderRightWidth: 0.5, borderRightColor: '#999', borderRightStyle: 'solid',
    textAlign: 'right',
  },
  colAmount: {
    width: 80, paddingHorizontal: 4, paddingVertical: 3,
    textAlign: 'right',
  },
  headerText: { fontWeight: 'bold', fontSize: 8, textAlign: 'center' },
  cellText: { fontSize: 8 },
  specText: { fontSize: 7, color: '#666', marginTop: 1 },
  // 合計セクション
  totalSection: {
    marginTop: 2,
    alignItems: 'flex-end',
  },
  totalLine: {
    flexDirection: 'row',
    borderTopWidth: 0.5, borderTopColor: '#999', borderTopStyle: 'solid',
    width: 200,
  },
  totalLineBold: {
    flexDirection: 'row',
    borderTopWidth: 1.5, borderTopColor: '#000', borderTopStyle: 'solid',
    width: 200,
    backgroundColor: '#f0f0f0',
  },
  totalLineLabel: {
    flex: 1, paddingHorizontal: 4, paddingVertical: 3,
    fontSize: 8, textAlign: 'right', color: '#444',
  },
  totalLineValue: {
    width: 80, paddingHorizontal: 4, paddingVertical: 3,
    fontSize: 8, textAlign: 'right',
  },
  totalLineValueBold: {
    width: 80, paddingHorizontal: 4, paddingVertical: 3,
    fontSize: 10, textAlign: 'right', fontWeight: 'bold',
  },
  // フッター
  footer: {
    marginTop: 10,
    borderTopWidth: 0.5, borderTopColor: '#aaa', borderTopStyle: 'solid',
    paddingTop: 6,
    flexDirection: 'row',
    gap: 16,
  },
  footerLeft: { flex: 1 },
  footerRight: { width: 180 },
  footerLabel: { fontSize: 8, fontWeight: 'bold', marginBottom: 3 },
  noteText: { fontSize: 7.5, color: '#333', lineHeight: 1.6, minHeight: 32 },
  bankInfo: { fontSize: 7.5, color: '#444', lineHeight: 1.6 },
  pageNo: { fontSize: 7, color: '#aaa', textAlign: 'right', marginTop: 4 },
});

// ── ユーティリティ ──────────────────────────────────────────────
const fmtYen = (n: number) => '¥' + Math.round(n).toLocaleString('ja-JP');
const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
};
const TAX_RATE = 0.10;
const MAX_ROWS = 22;

// ── PDF文書コンポーネント ────────────────────────────────────────
export function EstimatePdf({ data }: { data: EstimatePdfData }) {
  // 品目を行に展開
  const rows: { name: string; spec: string; qty: number; unit: number | null; amount: number }[] = [];
  for (const item of data.items) {
    for (const q of item.quantities) {
      rows.push({
        name: item.quantities.length > 1
          ? `${item.item_name}（${q.quantity.toLocaleString()}部）`
          : item.item_name,
        spec: item.spec ?? '',
        qty: q.quantity,
        unit: q.unit_price,
        amount: q.total,
      });
    }
  }

  const subtotal = rows.reduce((sum, r) => sum + r.amount, 0);
  const tax = Math.round(subtotal * TAX_RATE);
  const grandTotal = subtotal + tax;

  // ページ分割
  const pages: typeof rows[] = [];
  for (let i = 0; i < Math.max(1, Math.ceil(rows.length / MAX_ROWS)); i++) {
    pages.push(rows.slice(i * MAX_ROWS, (i + 1) * MAX_ROWS));
  }

  const createdAt = fmtDate(data.created_at);
  const validUntil = data.valid_until ? fmtDate(data.valid_until) : '—';
  const staffName = data.assigned_to_name ?? '';

  return (
    <Document>
      {pages.map((pageRows, pageIdx) => {
        const emptyCount = Math.max(0, MAX_ROWS - pageRows.length);
        const isLastPage = pageIdx === pages.length - 1;

        return (
          <Page key={pageIdx} size="A4" style={s.page}>

            {/* ── タイトル ── */}
            <View style={s.titleRow}>
              <Text style={s.title}>御　見　積　書</Text>
              <Text style={s.estimateNo}>
                見積番号：{data.estimate_number}{'\n'}
                発行日：{createdAt}
              </Text>
            </View>

            {/* ── ヘッダーグリッド：宛先 ←→ 差出人 ── */}
            <View style={s.headerGrid}>
              <View style={s.headerLeft}>
                <Text style={s.customerName}>{data.customer_name}</Text>
                <Text style={s.honorific}>　御中</Text>
                <View style={s.condRow}>
                  <Text style={s.condLabel}>有効期限：</Text>
                  <Text style={s.condValue}>{validUntil}</Text>
                </View>
                <View style={s.condRow}>
                  <Text style={s.condLabel}>担　当　者：</Text>
                  <Text style={s.condValue}>{staffName}</Text>
                </View>
              </View>
              <View style={s.headerRight}>
                <Text style={s.companyBlock}>
                  {'〒703-8236\n'}
                  {'岡山市東区浅川西町3-5\n'}
                  {'株式会社　岡文館印刷所\n'}
                  {'TEL 086-279-5151\n'}
                  {'FAX 086-279-5173'}
                </Text>
              </View>
            </View>

            {/* ── 件名・合計金額バー ── */}
            {pageIdx === 0 && (
              <>
                <View style={s.subjectBar}>
                  <Text style={s.subjectLabel}>件　名：</Text>
                  <Text style={s.subjectValue}>{data.title}</Text>
                  <View style={s.grandTotalBox}>
                    <Text style={s.grandTotalLabel}>お見積り金額（税込）</Text>
                    <Text style={s.grandTotalValue}>{fmtYen(grandTotal)}</Text>
                  </View>
                </View>
                <View style={s.greeting}>
                  <Text>下記の通りお見積り申し上げます。ご検討の上ご下命の程、よろしくお願い致します。</Text>
                </View>
              </>
            )}

            {/* ── 品目テーブル ── */}
            <View style={s.table}>
              <View style={s.tableHeaderRow}>
                <View style={s.colName}><Text style={s.headerText}>品　　　　名</Text></View>
                <View style={s.colQty}><Text style={s.headerText}>数　量</Text></View>
                <View style={s.colUnit}><Text style={s.headerText}>単　価</Text></View>
                <View style={s.colAmount}><Text style={s.headerText}>金　額</Text></View>
              </View>

              {pageRows.map((row, i) => (
                <View key={i} style={s.tableRow}>
                  <View style={s.colName}>
                    <Text style={s.cellText}>{row.name}</Text>
                    {row.spec ? <Text style={s.specText}>{row.spec}</Text> : null}
                  </View>
                  <View style={s.colQty}>
                    <Text style={s.cellText}>{row.qty.toLocaleString()}</Text>
                  </View>
                  <View style={s.colUnit}>
                    <Text style={s.cellText}>{row.unit != null ? fmtYen(row.unit) : ''}</Text>
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

            {/* ── 合計（最終ページのみ） ── */}
            {isLastPage && (
              <View style={s.totalSection}>
                <View style={s.totalLine}>
                  <Text style={s.totalLineLabel}>小　計</Text>
                  <Text style={s.totalLineValue}>{fmtYen(subtotal)}</Text>
                </View>
                <View style={s.totalLine}>
                  <Text style={s.totalLineLabel}>消費税（10%）</Text>
                  <Text style={s.totalLineValue}>{fmtYen(tax)}</Text>
                </View>
                <View style={s.totalLineBold}>
                  <Text style={s.totalLineLabel}>合　計（税込）</Text>
                  <Text style={s.totalLineValueBold}>{fmtYen(grandTotal)}</Text>
                </View>
              </View>
            )}

            {/* ── フッター（最終ページのみ） ── */}
            {isLastPage && (
              <View style={s.footer}>
                <View style={s.footerLeft}>
                  <Text style={s.footerLabel}>備　考</Text>
                  <Text style={s.noteText}>{data.note ?? ''}</Text>
                </View>
                <View style={s.footerRight}>
                  <Text style={s.footerLabel}>お振込先</Text>
                  <Text style={s.bankInfo}>
                    {'中国銀行　東岡山支店\n'}
                    {'当座　１２２９０\n'}
                    {'株式会社　岡文館印刷所'}
                  </Text>
                </View>
              </View>
            )}

            {/* ページ番号 */}
            {pages.length > 1 && (
              <Text style={s.pageNo}>{pageIdx + 1} / {pages.length}</Text>
            )}
          </Page>
        );
      })}
    </Document>
  );
}
