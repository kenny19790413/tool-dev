const ExcelJS = require('exceljs');
const path = require('path');

async function createBucketList() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'kenny19790413';
  wb.created = new Date();

  // ── カラーパレット ──────────────────────────
  const colors = {
    headerBg:   '1F3864',   // 濃紺（共通ヘッダー背景）
    headerFont: 'FFFFFF',   // 白文字
    travel:     'D6E4F7',   // 旅行：薄青
    experience: 'D9F7D6',   // 体験・スキル：薄緑
    thing:      'FFF3CD',   // モノ：薄黄
    people:     'F7D6E8',   // 人とのつながり：薄ピンク
    done:       'E8E8E8',   // 達成済み：グレー
    accent:     '2E75B6',   // アクセントブルー
  };

  const catColor = {
    '旅行':           colors.travel,
    '体験・スキル':   colors.experience,
    'モノ':           colors.thing,
    '人とのつながり': colors.people,
  };

  // ── サンプルデータ ─────────────────────────
  const items = [
    { cat: '旅行',           item: 'オーロラを見に行く（アイスランド）', priority: '高', year: 2027, done: '⬜', memo: '11〜2月が狙い目' },
    { cat: '旅行',           item: '京都の茶道体験をする',               priority: '中', year: 2026, done: '⬜', memo: '嵐山エリアを検討中' },
    { cat: '旅行',           item: '屋久島でトレッキング',               priority: '中', year: 2027, done: '⬜', memo: '縄文杉コースを歩きたい' },
    { cat: '体験・スキル',   item: 'スキューバダイビングの資格を取る',   priority: '高', year: 2026, done: '⬜', memo: 'PADIオープンウォーター' },
    { cat: '体験・スキル',   item: 'ギターを弾けるようになる',           priority: '低', year: 2028, done: '⬜', memo: '好きなアーティストの曲を1曲' },
    { cat: '体験・スキル',   item: '英語でプレゼンをする',               priority: '中', year: 2026, done: '✅', memo: '社内勉強会で達成！' },
    { cat: 'モノ',           item: 'コーヒーミルを手に入れる',           priority: '低', year: 2026, done: '✅', memo: 'Comandante C40 を購入' },
    { cat: 'モノ',           item: '理想のデスク環境を整える',           priority: '中', year: 2027, done: '⬜', memo: 'スタンディングデスク導入' },
    { cat: 'モノ',           item: 'フルサイズミラーレスカメラを買う',   priority: '中', year: 2028, done: '⬜', memo: 'Sony α7シリーズ検討中' },
    { cat: '人とのつながり', item: '恩師に手紙を書く',                   priority: '高', year: 2026, done: '⬜', memo: '大学のゼミの先生' },
    { cat: '人とのつながり', item: '親と国内旅行に行く',                 priority: '高', year: 2026, done: '⬜', memo: '両親の希望を聞く' },
    { cat: '人とのつながり', item: '憧れの人にメッセージを送る',         priority: '低', year: 2027, done: '⬜', memo: 'SNSで繋がるところから' },
  ];

  // ══════════════════════════════════════════
  // シート1：バケットリスト
  // ══════════════════════════════════════════
  const ws = wb.addWorksheet('バケットリスト', {
    views: [{ state: 'frozen', ySplit: 3 }],
    properties: { defaultRowHeight: 22 },
  });

  // タイトル行
  ws.mergeCells('A1:H1');
  const title = ws.getCell('A1');
  title.value = '🪣  My Bucket List';
  title.font = { name: 'Arial', size: 18, bold: true, color: { argb: colors.accent } };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 36;

  // サブタイトル行
  ws.mergeCells('A2:H2');
  const sub = ws.getCell('A2');
  sub.value = '死ぬまでにやりたいことリスト　—　更新日：' + new Date().toLocaleDateString('ja-JP');
  sub.font = { name: 'Arial', size: 10, italic: true, color: { argb: '888888' } };
  sub.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 20;

  // ヘッダー行（3行目）
  const headers = ['No', 'カテゴリ', '項目', '優先度', '目標年', '達成', 'メモ', ''];
  ws.addRow(headers);
  const headerRow = ws.getRow(3);
  headerRow.height = 24;
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.font = { name: 'Arial', bold: true, color: { argb: colors.headerFont }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.headerBg } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      bottom: { style: 'medium', color: { argb: colors.accent } },
    };
  });

  // データ行
  items.forEach((d, i) => {
    const row = ws.addRow([
      i + 1,
      d.cat,
      d.item,
      d.priority,
      d.year,
      d.done,
      d.memo,
    ]);
    row.height = 22;

    const bg = d.done === '✅' ? colors.done : (catColor[d.cat] || 'FFFFFF');

    row.eachCell((cell, colNum) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.font = { name: 'Arial', size: 10 };
      cell.alignment = { vertical: 'middle', wrapText: colNum === 3 };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'DDDDDD' } },
      };
    });

    // No・カテゴリ・優先度・目標年・達成 を中央揃え
    [1, 2, 4, 5, 6].forEach(c => {
      row.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // 優先度カラー
    const priCell = row.getCell(4);
    if (d.priority === '高') priCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'C00000' } };
    if (d.priority === '中') priCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'E07000' } };
    if (d.priority === '低') priCell.font = { name: 'Arial', size: 10, color: { argb: '666666' } };
  });

  // 列幅
  ws.getColumn(1).width = 6;
  ws.getColumn(2).width = 16;
  ws.getColumn(3).width = 38;
  ws.getColumn(4).width = 10;
  ws.getColumn(5).width = 10;
  ws.getColumn(6).width = 8;
  ws.getColumn(7).width = 30;
  ws.getColumn(8).width = 4;

  // 凡例（下部）
  const legendRow = ws.lastRow.number + 2;
  ws.getCell(`A${legendRow}`).value = '【カテゴリ別カラー凡例】';
  ws.getCell(`A${legendRow}`).font = { name: 'Arial', bold: true, size: 9, color: { argb: '555555' } };

  const legend = [
    ['B', colors.travel,     '旅行'],
    ['D', colors.experience, '体験・スキル'],
    ['F', colors.thing,      'モノ'],
    ['H', colors.people,     '人とのつながり'],
  ];
  legend.forEach(([col, color, label]) => {
    const c = ws.getCell(`${col}${legendRow}`);
    c.value = label;
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    c.font = { name: 'Arial', size: 9 };
    c.alignment = { horizontal: 'center' };
    c.border = { top:{style:'thin',color:{argb:'CCCCCC'}}, bottom:{style:'thin',color:{argb:'CCCCCC'}}, left:{style:'thin',color:{argb:'CCCCCC'}}, right:{style:'thin',color:{argb:'CCCCCC'}} };
  });

  // ══════════════════════════════════════════
  // シート2：使い方
  // ══════════════════════════════════════════
  const ws2 = wb.addWorksheet('使い方');
  ws2.getColumn(1).width = 3;
  ws2.getColumn(2).width = 60;

  const guide = [
    [''],
    ['', '📖  バケットリストの使い方'],
    [''],
    ['', '【このファイルについて】'],
    ['', '「死ぬまでにやりたいこと」を4つのカテゴリに分けて管理するリストです。'],
    [''],
    ['', '【列の説明】'],
    ['', '  No        ：通し番号（自動）'],
    ['', '  カテゴリ  ：旅行 / 体験・スキル / モノ / 人とのつながり'],
    ['', '  項目      ：やりたいことを具体的に書く'],
    ['', '  優先度    ：高 / 中 / 低 で設定'],
    ['', '  目標年    ：いつまでに実現したいか（西暦）'],
    ['', '  達成      ：完了したら ✅ に変更、未達成は ⬜ のまま'],
    ['', '  メモ      ：詳細・備考・リンクなど自由に記入'],
    [''],
    ['', '【使い方のヒント】'],
    ['', '  ・新しい項目は最終行の下に追加してください'],
    ['', '  ・達成したら「達成」列を ✅ に変え、行の色は自分でグレーに変えてもOK'],
    ['', '  ・優先度を定期的に見直して、今の自分に合った順位に更新しましょう'],
    ['', '  ・年に一度、棚卸しをして完了済み項目を振り返るのがおすすめです 🌱'],
    [''],
    ['', '【バージョン情報】'],
    ['', '  作成日：' + new Date().toLocaleDateString('ja-JP')],
    ['', '  管理者：kenny19790413'],
  ];

  guide.forEach(row => {
    const r = ws2.addRow(row);
    if (row[1] && row[1].startsWith('📖')) {
      r.getCell(2).font = { name: 'Arial', size: 16, bold: true, color: { argb: colors.accent } };
      r.height = 30;
    } else if (row[1] && row[1].startsWith('【')) {
      r.getCell(2).font = { name: 'Arial', size: 11, bold: true, color: { argb: colors.headerBg } };
    } else {
      r.getCell(2).font = { name: 'Arial', size: 10, color: { argb: '333333' } };
    }
  });

  // ── 保存 ──────────────────────────────────
  const outPath = path.join(__dirname, '..', 'bucket-list.xlsx');
  await wb.xlsx.writeFile(outPath);
  console.log('✅ 作成完了:', outPath);
}

createBucketList().catch(console.error);
