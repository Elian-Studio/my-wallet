'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderTree, ChevronRight } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">설정</h1>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/settings/categories"
          className="block transition-colors hover:bg-accent/40 rounded-lg"
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FolderTree className="h-5 w-5" />
                카테고리 관리
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
              <span>대분류 / 소분류 2단계 카테고리 트리 관리</span>
              <ChevronRight className="h-4 w-4" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
