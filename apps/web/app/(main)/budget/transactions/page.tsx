import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Receipt } from 'lucide-react';

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">거래 내역</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            거래 목록
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            거래 내역이 API 연동 후 표시됩니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
