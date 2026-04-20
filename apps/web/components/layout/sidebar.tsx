'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  BarChart3,
  TrendingUp,
  ArrowLeftRight,
  Building2,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: { label: string; href: string }[];
}

const navItems: NavItem[] = [
  {
    label: '대시보드',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: '가계부',
    href: '/budget',
    icon: Wallet,
    children: [
      { label: '거래 내역', href: '/budget/transactions' },
      { label: '예산 분석', href: '/budget/analysis' },
    ],
  },
  {
    label: '주식',
    href: '/stocks',
    icon: TrendingUp,
    children: [
      { label: '매매 내역', href: '/stocks/trades' },
    ],
  },
  {
    label: '설정',
    href: '/settings',
    icon: Settings,
    children: [
      { label: '카테고리 관리', href: '/settings/categories' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>(() => {
    const expanded: string[] = [];
    navItems.forEach((item) => {
      if (
        item.children &&
        (pathname.startsWith(item.href))
      ) {
        expanded.push(item.href);
      }
    });
    return expanded;
  });

  const toggleExpand = (href: string) => {
    setExpandedItems((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href],
    );
  };

  const isActive = (href: string) => pathname === href;
  const isGroupActive = (href: string) => pathname.startsWith(href);

  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-border lg:bg-card">
      <div className="flex h-14 items-center border-b border-border px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Wallet className="h-6 w-6" />
          <span className="text-lg font-bold">My Wallet</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-4" aria-label="Main navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const hasChildren = !!item.children;
          const isExpanded = expandedItems.includes(item.href);
          const groupActive = isGroupActive(item.href);

          return (
            <div key={item.href}>
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => toggleExpand(item.href)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                    groupActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground',
                  )}
                  aria-expanded={isExpanded}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 transition-transform',
                      isExpanded && 'rotate-180',
                    )}
                  />
                </button>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                    isActive(item.href)
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )}

              {hasChildren && isExpanded && (
                <div className="ml-4 mt-1 space-y-1 border-l border-border pl-3">
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
                      isActive(item.href)
                        ? 'font-medium text-foreground'
                        : 'text-muted-foreground',
                    )}
                  >
                    개요
                  </Link>
                  {item.children!.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={cn(
                        'flex items-center rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
                        isActive(child.href)
                          ? 'font-medium text-foreground'
                          : 'text-muted-foreground',
                      )}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
