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

  return NextResponse.json({ ok: true, message: 'テーブル作成・初期データ投入完了' });
}
