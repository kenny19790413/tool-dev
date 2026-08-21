import { GLOSSARY } from '@/lib/glossary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default function GlossaryPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">用語集</h1>
        <p className="text-sm text-gray-500 mt-1">
          アプリ内で使われる専門用語をまとめています。各画面の「？」アイコンからも同じ説明を確認できます。
        </p>
      </div>
      <div className="space-y-3">
        {GLOSSARY.map((entry) => (
          <Card key={entry.slug}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{entry.term}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 leading-relaxed">{entry.definition}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
