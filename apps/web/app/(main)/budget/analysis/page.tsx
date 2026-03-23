import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export default function BudgetAnalysisPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">예산 분석</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            카테고리별 예산 대비 실적
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            예산 분석 데이터가 API 연동 후 표시됩니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
