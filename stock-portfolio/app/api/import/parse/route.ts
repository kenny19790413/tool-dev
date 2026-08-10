import { NextRequest, NextResponse } from 'next/server';
import { parseHoldingsFromImage } from '@/lib/stock/imageParse';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('image');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: '画像ファイルを選択してください' }, { status: 400 });
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: '画像サイズが大きすぎます（8MB以下にしてください）' }, { status: 400 });
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: '画像ファイルを選択してください' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Data = buffer.toString('base64');

    const holdings = await parseHoldingsFromImage(base64Data, file.type);
    if (holdings.length === 0) {
      return NextResponse.json({ error: '画像から銘柄情報を読み取れませんでした' }, { status: 422 });
    }

    return NextResponse.json({ holdings });
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : '画像解析に失敗しました';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
