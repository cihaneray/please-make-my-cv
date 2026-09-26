'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
import { Icons } from './Icons';

const NAV_ITEMS = [
  { label: 'Home', href: '/', icon: Icons.Home },
  { label: 'Resumes', href: '/resumes', icon: Icons.Document },
  { label: 'Jobs', href: '/jobs', icon: Icons.Jobs },
  { label: 'Library', href: '/library', icon: Icons.Library },
  { label: 'Templates', href: '/templates', icon: Icons.Templates },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-[220px] bg-surface-container-lowest border-r border-surface-container-highest z-50 flex flex-col justify-between select-none no-print">
      <div className="flex flex-col">
        {/* Brand header */}
        <div className="h-14 px-space-lg flex items-center gap-space-sm border-b border-surface-container-high">
          <div className="w-6 h-6 rounded bg-primary text-on-primary flex items-center justify-center">
            <Icons.Document size={14} className="text-white" />
          </div>
          <span className="font-headline-md text-headline-md tracking-tight text-on-surface">
            CV Workspace
          </span>
        </div>

        {/* Main navigation */}
        <nav className="flex flex-col gap-space-xs p-space-sm">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-space-md px-space-md py-space-xs rounded transition-colors text-label-md font-label-md ${
                  isActive
                    ? 'bg-surface-container-high text-on-surface font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer controls */}
      <div className="flex flex-col p-space-sm border-t border-surface-container-high gap-space-xs">
        <Link
          href="/import"
          className="flex items-center gap-space-md px-space-md py-space-xs rounded text-on-surface-variant font-label-md text-label-md hover:bg-surface-container hover:text-on-surface transition-colors"
        >
          <Icons.Upload size={18} />
          <span>Import CV</span>
        </Link>

        <div className="pt-space-xs mt-space-xs border-t border-surface-container-high">
          <div className="flex items-center justify-between px-space-md py-space-xs rounded hover:bg-surface-container transition-colors cursor-pointer">
            <div className="flex items-center gap-space-sm min-w-0">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <Icons.User size={15} className="text-white" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-label-md text-label-md text-on-surface truncate">
                  Personal Team
                </span>
                <span className="font-body-sm text-body-sm text-secondary truncate">
                  workspace.cv
                </span>
              </div>
            </div>
            <Icons.Unfold size={15} className="text-secondary flex-shrink-0" />
          </div>
        </div>
      </div>
    </aside>
  );
}
