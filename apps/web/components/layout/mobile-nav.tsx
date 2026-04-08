'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  Settings,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

const navItems = [
  { label: '대시보드', href: '/dashboard', icon: LayoutDashboard },
  { label: '가계부', href: '/budget', icon: Wallet },
  { label: '주식', href: '/stocks', icon: TrendingUp },
  { label: '설정', href: '/settings', icon: Settings },
];

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="fixed inset-0 bg-black/80" onClick={onClose} />
      <nav className="fixed left-0 top-0 bottom-0 w-72 bg-card p-6" aria-label="Mobile navigation">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="h-6 w-6" />
            <span className="text-lg font-bold">My Wallet</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="메뉴 닫기">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
