import { NextRequest, NextResponse } from 'next/server';
import { parseHoldingsFromImages } from '@/lib/stock/imageParse';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_COUNT = 6;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    // 複数画像対応: "images" (複数) を優先し、後方互換として単数の "image" も受け付ける
    const files = [...formData.getAll('images'), ...formData.getAll('image')].filter(
      (f): f is File => f instanceof File
    );
    if (files.length === 0) {
      return NextResponse.json({ error: '画像ファイルを選択してください' }, { status: 400 });
    }
    if (files.length > MAX_IMAGE_COUNT) {
      return NextResponse.json({ error: `画像は${MAX_IMAGE_COUNT}枚までにしてください` }, { status: 400 });
    }
    for (const file of files) {
      if (file.size > MAX_IMAGE_BYTES) {
        return NextResponse.json({ error: '画像サイズが大きすぎます（8MB以下にしてください）' }, { status: 400 });
      }
      if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: '画像ファイルを選択してください' }, { status: 400 });
      }
    }

    const images = await Promise.all(
      files.map(async (file) => ({
        base64Data: Buffer.from(await file.arrayBuffer()).toString('base64'),
        mimeType: file.type,
      }))
    );

    const holdings = await parseHoldingsFromImages(images);
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
