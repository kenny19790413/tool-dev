// 証券会社サイトの保有資産一覧スクリーンショットをGemini Vision APIで解析し、
// 構造化データ（銘柄名・保有数量・評価額など）を抽出する。

import { GoogleGenAI, Type } from '@google/genai';

export interface ParsedHolding {
  name: string;
  ticker: string | null;
  quantity: number | null;
  evaluationValueJpy: number | null;
  currency: 'JPY' | 'USD';
  foreignValue: number | null;
  referencePrice: number | null;
  note: string | null;
}

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    holdings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: '銘柄・ファンド名' },
          ticker: {
            type: Type.STRING,
            nullable: true,
            description: '証券コード・銘柄コードが明記されている場合のみ（例: 4760, 7203）。無ければnull。',
          },
          quantity: { type: Type.NUMBER, nullable: true, description: '保有数量・保有口数' },
          evaluationValueJpy: {
            type: Type.NUMBER,
            nullable: true,
            description: '評価額（円建て）。円建て評価額が表示されていればその数値。',
          },
          currency: { type: Type.STRING, enum: ['JPY', 'USD'], description: '外貨建て資産の場合の通貨。円建てのみならJPY。' },
          foreignValue: {
            type: Type.NUMBER,
            nullable: true,
            description: '外貨評価額（米ドル建て資産の場合のドル金額。無ければnull）',
          },
          referencePrice: { type: Type.NUMBER, nullable: true, description: '参考時価・基準価額（1単位あたりの価格）' },
          note: {
            type: Type.STRING,
            nullable: true,
            description: '取得コスト・取得金額・評価損益・決算日・償還日など、その他読み取れた情報を短くまとめたメモ',
          },
        },
        required: ['name', 'currency'],
      },
    },
  },
  required: ['holdings'],
};

export async function parseHoldingsFromImage(base64Data: string, mimeType: string): Promise<ParsedHolding[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY が設定されていません');

  const ai = new GoogleGenAI({ apiKey });

  const result = await ai.models.generateContent({
    model: 'gemini-flash-latest',
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          {
            text: '証券会社サイトの保有資産一覧の画像です。表に含まれる銘柄・ファンドをすべて抽出してください。金額はカンマや円記号を除いた数値にしてください。読み取れない項目はnullにしてください。',
          },
        ],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const text = result.text;
  if (!text) throw new Error('画像から情報を抽出できませんでした');

  const parsed = JSON.parse(text) as { holdings: ParsedHolding[] };
  return parsed.holdings ?? [];
}
