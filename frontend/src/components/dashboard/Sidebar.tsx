'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import {
  Database, LayoutDashboard, Upload, BarChart3,
  Brain, FileText, Settings, LogOut, Zap, Menu, X
} from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/datasets', label: 'Datasets', icon: Database },
  { href: '/upload', label: 'Upload', icon: Upload },
  { href: '/insights', label: 'AI Insights', icon: Brain },
  { href: '/reports', label: 'Reports', icon: FileText },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <aside className={clsx(
        'fixed left-0 top-0 h-full z-40 flex flex-col transition-all duration-300',
        'bg-dark-card border-r border-dark-border',
        collapsed ? 'w-16' : 'w-60'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 p-4 border-b border-dark-border h-16">
          <div className="w-8 h-8 bg-brand-500/10 border border-brand-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-brand-500" />
          </div>
          {!collapsed && (
            <span className="font-display text-lg font-bold text-white">DataIQ</span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto text-text-muted hover:text-text-secondary transition-colors"
          >
            {collapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
                  active
                    ? 'bg-brand-500/10 text-brand-500 border border-brand-500/20'
                    : 'text-text-secondary hover:text-white hover:bg-white/5'
                )}
              >
                <Icon className={clsx('w-4 h-4 flex-shrink-0', active && 'drop-shadow-[0_0_6px_rgba(0,212,255,0.6)]')} />
                {!collapsed && <span className="text-sm font-medium">{label}</span>}
                {active && !collapsed && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-2 border-t border-dark-border space-y-1">
          <Link
            href="/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-secondary hover:text-white hover:bg-white/5 transition-all"
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Settings</span>}
          </Link>

          {user && (
            <div className={clsx('flex items-center gap-3 px-3 py-2', collapsed && 'justify-center')}>
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center flex-shrink-0 text-xs font-bold text-dark-bg">
                {user.first_name?.[0]?.toUpperCase() || 'U'}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-white truncate">{user.full_name}</div>
                  <div className="text-xs text-text-muted truncate">{user.plan} plan</div>
                </div>
              )}
            </div>
          )}

          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-400/5 transition-all"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span className="text-sm">Sign out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
