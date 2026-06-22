// PrintQuote 初期マスタデータ投入（neon HTTPクライアント版）
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });

import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  console.log('🌱 シードデータ投入開始...');
  console.log('DB:', process.env.DATABASE_URL?.substring(0, 30) + '...');

  // ── システム設定 ───────────────────────────────────────────
  await sql`
    INSERT INTO system_settings (key, value, description, updated_at) VALUES
      ('overhead_rate',       '15',  '営業経費率（%）',          NOW()),
      ('rounding_unit',       '100', '合計金額の丸め単位（円）', NOW()),
      ('waste_rate_normal',   '15',  '通常ヤレ率（%）',          NOW()),
      ('waste_rate_thomson',  '10',  'トムソン追加ヤレ率（%）',  NOW()),
      ('sheet_unit',          '50',  '全紙数切り上げ単位（枚）', NOW()),
      ('estimate_valid_days', '30',  '見積有効期限（日）',        NOW())
    ON CONFLICT (key) DO NOTHING
  `;
  console.log('  ✓ システム設定');

  // ── 管理者ユーザー ─────────────────────────────────────────
  const adminHash = await bcrypt.hash('admin1234', 10);
  await sql`
    INSERT INTO users (name, email, password_hash, role, is_active, created_at, updated_at)
    VALUES ('管理者', 'admin@okabunkan.co.jp', ${adminHash}, 'admin', true, NOW(), NOW())
    ON CONFLICT (email) DO NOTHING
  `;
  console.log('  ✓ 管理者ユーザー');

  // ── 用紙マスタ ─────────────────────────────────────────────
  await sql`
    INSERT INTO papers (number, name, parent_size, width_mm, height_mm, ream_weight, unit_price, low_vol_price, rate, is_active, created_at, updated_at) VALUES
      (1,  'コートL 90kg',       'A全', 625, 880,  90,  8.50, 10.00, 100, true, NOW(), NOW()),
      (2,  'コートL 110kg',      'A全', 625, 880,  110, 10.20, 12.00, 100, true, NOW(), NOW()),
      (3,  'コートL 135kg',      'A全', 625, 880,  135, 12.50, 14.50, 100, true, NOW(), NOW()),
      (4,  'コートL 180kg',      'A全', 625, 880,  180, 16.80, 19.50, 100, true, NOW(), NOW()),
      (5,  'マットコート 90kg',  'A全', 625, 880,  90,  9.20,  11.00, 100, true, NOW(), NOW()),
      (6,  'マットコート 110kg', 'A全', 625, 880,  110, 11.00, 13.00, 100, true, NOW(), NOW()),
      (10, 'コートL 90kg B全',   'B全', 765, 1085, 90,  12.80, 15.00, 100, true, NOW(), NOW()),
      (11, 'コートL 110kg B全',  'B全', 765, 1085, 110, 15.50, 18.00, 100, true, NOW(), NOW()),
      (20, 'ミラーコート 180kg', 'A全', 625, 880,  180, 22.00, 26.00, 100, true, NOW(), NOW()),
      (30, 'クラフト 70kg',      'A全', 625, 880,  70,  5.50,  NULL,  100, true, NOW(), NOW())
    ON CONFLICT (number) DO NOTHING
  `;
  console.log('  ✓ 用紙マスタ（10件）');

  // ── 印刷単価マスタ ─────────────────────────────────────────
  await sql`
    INSERT INTO print_price_masters (color_type, min_sheets, max_sheets, unit_price, created_at, updated_at) VALUES
      ('process', 0,     500,   2.50, NOW(), NOW()),
      ('process', 500,   1000,  1.80, NOW(), NOW()),
      ('process', 1000,  3000,  1.20, NOW(), NOW()),
      ('process', 3000,  5000,  0.90, NOW(), NOW()),
      ('process', 5000,  10000, 0.70, NOW(), NOW()),
      ('process', 10000, NULL,  0.55, NOW(), NOW()),
      ('special', 0,     500,   3.00, NOW(), NOW()),
      ('special', 500,   1000,  2.20, NOW(), NOW()),
      ('special', 1000,  3000,  1.50, NOW(), NOW()),
      ('special', 3000,  NULL,  1.10, NOW(), NOW())
    ON CONFLICT DO NOTHING
  `;
  console.log('  ✓ 印刷単価マスタ（10件）');

  // ── 加工単価マスタ ─────────────────────────────────────────
  await sql`
    INSERT INTO processing_price_masters (process_type, product_type, threshold, fixed_price, coeff_a, coeff_b, per_sheet_price, note, created_at, updated_at) VALUES
      ('cutting',    NULL,    3000,  1500,  NULL, NULL, NULL, '<3,000枚',      NOW(), NOW()),
      ('cutting',    NULL,    10000, 2000,  NULL, NULL, NULL, '<10,000枚',     NOW(), NOW()),
      ('cutting',    NULL,    20000, 3000,  NULL, NULL, NULL, '<20,000枚',     NOW(), NOW()),
      ('cutting',    NULL,    0,     0,     NULL, NULL, 0.25, '>=20,000枚 従量', NOW(), NOW()),
      ('press',      NULL,    640,   8000,  14,   4,    NULL, NULL,            NOW(), NOW()),
      ('pp',         NULL,    500,   10000, 27,   11,   NULL, NULL,            NOW(), NOW()),
      ('emboss',     NULL,    1500,  6000,  NULL, NULL, 4,    NULL,            NOW(), NOW()),
      ('lamination', 'thick', 500,   8000,  40,   0,    NULL, '厚物',          NOW(), NOW()),
      ('lamination', 'thin',  500,   8000,  20,   10,   NULL, '薄物',          NOW(), NOW()),
      ('corrugated', 'thick', 500,   10000, 70,   0,    NULL, '厚物',          NOW(), NOW()),
      ('corrugated', 'thin',  300,   10000, 70,   0,    NULL, '薄物',          NOW(), NOW())
    ON CONFLICT DO NOTHING
  `;
  console.log('  ✓ 加工単価マスタ（11件）');

  console.log('✅ シードデータ投入完了！');
}

main().catch((e) => {
  console.error('❌ エラー:', e);
  process.exit(1);
});
