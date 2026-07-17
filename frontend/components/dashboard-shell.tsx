"use client";

import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ThemeToggle } from '@/components/theme-provider';
import { BarChart3, ChevronDown, LayoutDashboard, Menu, Settings2, ShieldCheck, Sparkles, X } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { logout, type UserRole } from '@/services/auth-service';

type NavHref = string;

interface NavItem {
  href: NavHref;
  label: string;
  icon: LucideIcon;
}

const roleNavItems: Record<UserRole, NavItem[]> = {
  citizen: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/report', label: 'Report Incident', icon: Sparkles },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/predictions', label: 'Predictions', icon: Sparkles },
    { href: '/decisions', label: 'Decision Support', icon: Sparkles },
    { href: '/explainability', label: 'Explainability', icon: Sparkles },
    { href: '/settings', label: 'Settings', icon: Settings2 },
  ],
  officer: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/report', label: 'Report Incident', icon: Sparkles },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/predictions', label: 'Predictions', icon: Sparkles },
    { href: '/decisions', label: 'Decision Support', icon: Sparkles },
    { href: '/explainability', label: 'Explainability', icon: Sparkles },
    { href: '/settings', label: 'Settings', icon: Settings2 },
  ],
  department_head: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/predictions', label: 'Predictions', icon: Sparkles },
    { href: '/decisions', label: 'Decision Support', icon: Sparkles },
    { href: '/explainability', label: 'Explainability', icon: Sparkles },
    { href: '/admin', label: 'Admin', icon: ShieldCheck },
    { href: '/settings', label: 'Settings', icon: Settings2 },
  ],
  administrator: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/report', label: 'Report Incident', icon: Sparkles },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/predictions', label: 'Predictions', icon: Sparkles },
    { href: '/decisions', label: 'Decision Support', icon: Sparkles },
    { href: '/explainability', label: 'Explainability', icon: Sparkles },
    { href: '/admin', label: 'Admin', icon: ShieldCheck },
    { href: '/settings', label: 'Settings', icon: Settings2 },
  ],
};

function NavLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate?: () => void }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href as never}
      onClick={onNavigate}
      className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition ${active ? 'bg-cyan-500/15 text-cyan-200 shadow-[0_0_0_1px_rgba(34,211,238,0.18)]' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
    >
      <Icon className="h-4 w-4" />
      <span>{item.label}</span>
    </Link>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const role = (user?.role ?? 'citizen') as UserRole;
  const navItems = roleNavItems[role] ?? roleNavItems.citizen;
  const primaryItems = navItems.slice(0, 4);
  const overflowItems = navItems.slice(4);

  useEffect(() => {
    setMobileOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  const isActive = (href: string) => pathname === href || (href !== '/' && pathname.startsWith(href));

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_35%)] text-slate-50">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-cyan-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-950">
        Skip to main content
      </a>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">CityBrain OS</p>
              <h1 className="text-sm font-semibold text-white">Operations Console</h1>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1 md:flex">
            {primaryItems.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(item.href)} />
            ))}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMoreOpen((value) => !value)}
                className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                <span>More</span>
                <ChevronDown className={`h-4 w-4 transition ${moreOpen ? 'rotate-180' : ''}`} />
              </button>
              {moreOpen ? (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-white/10 bg-slate-900/95 p-2 shadow-2xl shadow-black/30">
                  {overflowItems.map((item) => (
                    <NavLink key={item.href} item={item} active={isActive(item.href)} onNavigate={() => setMoreOpen(false)} />
                  ))}
                </div>
              ) : null}
            </div>
          </nav>

          <div className="flex items-center gap-2">
            {user ? <span className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-300 sm:inline-block">{user.displayName || user.email || 'Operator'}</span> : null}
            <div className="hidden sm:block">
              {/* theme toggle */}
              <ThemeToggle />
            </div>
            <button type="button" className="inline-flex rounded-full border border-white/10 bg-white/5 p-2 text-slate-200 md:hidden" onClick={() => setMobileOpen((value) => !value)} aria-label="Toggle navigation">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <div className="border-t border-white/10 bg-slate-950/95 px-4 py-4 md:hidden">
            <div className="flex flex-col gap-2">
              {[...primaryItems, ...overflowItems].map((item) => (
                <NavLink key={item.href} item={item} active={isActive(item.href)} onNavigate={() => setMobileOpen(false)} />
              ))}
              <button type="button" onClick={() => { void logout(); setMobileOpen(false); }} className="mt-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-slate-300">
                Sign out
              </button>
            </div>
          </div>
        ) : null}
      </header>
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
