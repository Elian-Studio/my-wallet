import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2 } from 'lucide-react';

interface AccountDetailPageProps {
  params: Promise<{ accountId: string }>;
}

export default async function AccountDetailPage({ params }: AccountDetailPageProps) {
  const { accountId } = await params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">계좌 상세</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            계좌 정보 (ID: {accountId})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            계좌별 보유 종목 및 성과 데이터가 API 연동 후 표시됩니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
