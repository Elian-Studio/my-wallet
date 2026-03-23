import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

interface StockDetailPageProps {
  params: Promise<{ stockId: string }>;
}

export default async function StockDetailPage({ params }: StockDetailPageProps) {
  const { stockId } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">종목 상세</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            종목 정보 (ID: {stockId})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            종목 상세 정보가 API 연동 후 표시됩니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
