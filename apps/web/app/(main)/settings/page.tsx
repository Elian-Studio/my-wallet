import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">설정</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            계정 설정
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            계정 및 앱 설정이 API 연동 후 표시됩니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
