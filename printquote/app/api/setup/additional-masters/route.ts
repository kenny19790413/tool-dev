import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function POST() {
  await sql`
    CREATE TABLE IF NOT EXISTS size_masters (
      id         SERIAL PRIMARY KEY,
      name       VARCHAR(50)   NOT NULL,
      width_mm   DECIMAL(7,1)  NOT NULL,
      height_mm  DECIMAL(7,1)  NOT NULL,
      note       TEXT,
      sort_order INT           NOT NULL DEFAULT 0,
      is_active  BOOLEAN       NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    INSERT INTO size_masters (name, width_mm, height_mm, sort_order) VALUES
      ('A3',       297, 420,  10),('A4',       210, 297,  20),
      ('A5',       148, 210,  30),('A6',       105, 148,  40),
      ('B4',       257, 364,  50),('B5',       182, 257,  60),
      ('B6',       128, 182,  70),('名刺',      91,  55,  80),
      ('ハガキ',   100, 148,  90),('長3封筒',  235, 120, 100),
      ('角2封筒',  332, 240, 110)
    ON CONFLICT DO NOTHING
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS product_categories (
      id         SERIAL PRIMARY KEY,
      name       VARCHAR(50)  NOT NULL,
      sort_order INT          NOT NULL DEFAULT 0,
      is_active  BOOLEAN      NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    INSERT INTO product_categories (name, sort_order) VALUES
      ('チラシ', 10),('名刺', 20),('封筒', 30),
      ('パンフレット・冊子', 40),('カタログ', 50),('ポスター', 60),
      ('カレンダー', 70),('伝票', 80),('化粧箱', 90),
      ('ラベル', 100),('その他', 110)
    ON CONFLICT DO NOTHING
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS spec_templates (
      id               SERIAL PRIMARY KEY,
      name             VARCHAR(100)  NOT NULL,
      category_id      INT           REFERENCES product_categories(id),
      finish_width_mm  DECIMAL(7,1),
      finish_height_mm DECIMAL(7,1),
      paper_id         INT           REFERENCES papers(id),
      faces            INT           NOT NULL DEFAULT 1,
      cuts             INT           NOT NULL DEFAULT 1,
      front_colors     INT           NOT NULL DEFAULT 4,
      back_colors      INT           NOT NULL DEFAULT 0,
      coater           VARCHAR(10)   NOT NULL DEFAULT 'none',
      color_type       VARCHAR(10)   NOT NULL DEFAULT 'process',
      waste_rate       DECIMAL(5,2)  NOT NULL DEFAULT 15,
      process_types    TEXT[]        NOT NULL DEFAULT '{}',
      default_quantities TEXT        NOT NULL DEFAULT '1000,3000,5000',
      note             TEXT,
      is_active        BOOLEAN       NOT NULL DEFAULT true,
      created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
    )
  `;

  // 祝日・休業日マスタ
  await sql`
    CREATE TABLE IF NOT EXISTS holidays (
      id         SERIAL PRIMARY KEY,
      date       DATE         NOT NULL UNIQUE,
      name       VARCHAR(50)  NOT NULL,
      type       VARCHAR(20)  NOT NULL DEFAULT 'public',
      created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `;
  // 2026年の主要祝日
  await sql`
    INSERT INTO holidays (date, name, type) VALUES
      ('2026-01-01', '元日',             'public'),
      ('2026-01-12', '成人の日',         'public'),
      ('2026-02-11', '建国記念の日',     'public'),
      ('2026-02-23', '天皇誕生日',       'public'),
      ('2026-03-20', '春分の日',         'public'),
      ('2026-04-29', '昭和の日',         'public'),
      ('2026-05-03', '憲法記念日',       'public'),
      ('2026-05-04', 'みどりの日',       'public'),
      ('2026-05-05', 'こどもの日',       'public'),
      ('2026-07-20', '海の日',           'public'),
      ('2026-08-11', '山の日',           'public'),
      ('2026-09-21', '敬老の日',         'public'),
      ('2026-09-23', '秋分の日',         'public'),
      ('2026-10-12', 'スポーツの日',     'public'),
      ('2026-11-03', '文化の日',         'public'),
      ('2026-11-23', '勤労感謝の日',     'public')
    ON CONFLICT (date) DO NOTHING
  `;

  // 工程別生産日数マスタ
  await sql`
    CREATE TABLE IF NOT EXISTS production_day_masters (
      id           SERIAL PRIMARY KEY,
      process_type VARCHAR(30)  NOT NULL,
      quantity_min INT          NOT NULL DEFAULT 0,
      quantity_max INT,
      days         INT          NOT NULL DEFAULT 1,
      note         TEXT,
      created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    INSERT INTO production_day_masters (process_type, quantity_min, quantity_max, days) VALUES
      ('print',      0,     999,   1),
      ('print',      1000,  4999,  2),
      ('print',      5000,  9999,  3),
      ('print',      10000, NULL,  4),
      ('cutting',    0,     4999,  1),
      ('cutting',    5000,  NULL,  2),
      ('pp',         0,     4999,  1),
      ('pp',         5000,  NULL,  2),
      ('press',      0,     4999,  1),
      ('press',      5000,  NULL,  2),
      ('emboss',     0,     4999,  2),
      ('emboss',     5000,  NULL,  3),
      ('foil',       0,     4999,  2),
      ('foil',       5000,  NULL,  3),
      ('lamination', 0,     4999,  1),
      ('lamination', 5000,  NULL,  2),
      ('corrugated', 0,     4999,  1),
      ('corrugated', 5000,  NULL,  2),
      ('thomson',    0,     4999,  2),
      ('thomson',    5000,  NULL,  3),
      ('binding',    0,     4999,  2),
      ('binding',    5000,  NULL,  3),
      ('packing',    0,     NULL,  1)
    ON CONFLICT DO NOTHING
  `;

  return NextResponse.json({ ok: true, message: 'テーブル作成・初期データ投入完了' });
}
