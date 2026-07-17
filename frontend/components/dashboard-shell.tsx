"use client";

import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ThemeToggle } from '@/components/theme-provider';
import { AboutModal, HelpCenterModal, LogoutConfirmModal, SettingsModal } from '@/components/ui-dialogs';
import { BarChart3, Bell, ChevronDown, LayoutDashboard, Menu, Settings2, ShieldCheck, Sparkles, UserCircle, X, CheckCheck, CircleAlert, Info, ShieldAlert, Sparkles as SparkleIcon } from 'lucide-react';
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

const NavLink = ({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate?: () => void }) => {
  const Icon = item.icon;

  return (
    <Link
      href={item.href as never}
      onClick={onNavigate}
      className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-all duration-200 ${active ? 'bg-cyan-500/15 text-cyan-200 shadow-[0_0_0_1px_rgba(34,211,238,0.18)]' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
    >
      <Icon className={`h-4 w-4 ${active ? 'text-cyan-200' : 'text-slate-400'}`} />
      <span>{item.label}</span>
    </Link>
  );
};

const MemoizedNavLink = memo(NavLink);

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const accountRef = useRef<HTMLDivElement | null>(null);
  const role = (user?.role ?? 'citizen') as UserRole;

  const navItems = useMemo(() => roleNavItems[role] ?? roleNavItems.citizen, [role]);
  const primaryItems = useMemo(() => navItems.slice(0, 4), [navItems]);
  const overflowItems = useMemo(() => navItems.slice(4), [navItems]);

  const notifications = useMemo(() => [
    { id: 1, category: 'Incident', title: 'Flood alert escalated', message: 'Downtown drainage signal now requires field review.', unread: true, time: '2m ago' },
    { id: 2, category: 'AI', title: 'Confidence improved', message: 'Prediction confidence rose to 94% for the latest report.', unread: true, time: '12m ago' },
    { id: 3, category: 'System', title: 'Runtime healthy', message: 'The backend and agent runtime are operating normally.', unread: false, time: '28m ago' },
    { id: 4, category: 'Warning', title: 'Queue pressure', message: 'Pending review volume is above the recent average.', unread: true, time: '41m ago' },
    { id: 5, category: 'Success', title: 'Report exported', message: 'The latest executive report was exported successfully.', unread: false, time: '1h ago' },
  ], []);

  const unreadCount = useMemo(() => notifications.filter((item) => item.unread).length, [notifications]);

  useEffect(() => {
    setMobileOpen(false);
    setMoreOpen(false);
    setNotificationsOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      const target = event.target as any;
      if (notificationsRef.current && target && !notificationsRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
      if (accountRef.current && target && !accountRef.current.contains(target)) {
        setAccountOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: any) => {
      if (event.key === 'Escape') {
        setNotificationsOpen(false);
        setAccountOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isActive = useCallback((href: string) => pathname === href || (href !== '/' && pathname.startsWith(href)), [pathname]);
  const toggleNotifications = useCallback(() => {
    setNotificationsOpen((value) => !value);
    setAccountOpen(false);
  }, []);
  const toggleAccount = useCallback(() => {
    setAccountOpen((value) => !value);
    setNotificationsOpen(false);
  }, []);
  const closePanels = useCallback(() => {
    setNotificationsOpen(false);
    setAccountOpen(false);
  }, []);

  const handleLogoutConfirm = useCallback(() => {
    void logout();
    setLogoutOpen(false);
    setAccountOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_35%)] text-slate-50">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-cyan-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-950">
        Skip to main content
      </a>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200 shadow-sm shadow-cyan-500/10">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-200">CityBrain OS</p>
                <h1 className="text-sm font-semibold text-white">Operations Console</h1>
              </div>
            </Link>
          </div>

          <nav className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1 shadow-sm shadow-black/20 md:flex">
            {primaryItems.map((item) => (
              <MemoizedNavLink key={item.href} item={item} active={isActive(item.href)} />
            ))}
            <div className="relative">
              <button
                type="button"
                onClick={() => setMoreOpen((value) => !value)}
                className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
                aria-expanded={moreOpen}
                aria-label="More navigation"
              >
                <span>More</span>
                <ChevronDown className={`h-4 w-4 transition ${moreOpen ? 'rotate-180' : ''}`} />
              </button>
              {moreOpen ? (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-white/10 bg-slate-900/95 p-2 shadow-2xl shadow-black/30">
                  {overflowItems.map((item) => (
                    <MemoizedNavLink key={item.href} item={item} active={isActive(item.href)} onNavigate={() => setMoreOpen(false)} />
                  ))}
                </div>
              ) : null}
            </div>
          </nav>

          <div className="flex items-center gap-2">
            <div className="relative" ref={notificationsRef}>
              <button type="button" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400" aria-label="Notifications" onClick={toggleNotifications}>
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Alerts</span>
                {unreadCount > 0 ? <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[11px] font-semibold text-cyan-100">{unreadCount}</span> : null}
              </button>
              {notificationsOpen ? (
                <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-[24px] border border-white/10 bg-slate-900/95 p-3 shadow-2xl shadow-black/40 backdrop-blur-xl animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between px-2 py-1">
                    <div>
                      <p className="text-sm font-semibold text-white">Notifications</p>
                      <p className="text-xs text-slate-400">{unreadCount} unread</p>
                    </div>
                    <button type="button" className="text-sm font-medium text-cyan-200 transition hover:text-cyan-100" onClick={() => setNotificationsOpen(false)}>Close</button>
                  </div>
                  <div className="mt-3 max-h-72 overflow-y-auto pr-1">
                    {notifications.length ? notifications.map((item) => (
                      <div key={item.id} className={`rounded-2xl border p-3 ${item.unread ? 'border-cyan-400/20 bg-cyan-500/10' : 'border-white/10 bg-white/5'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {item.category === 'Incident' ? <CircleAlert className="h-4 w-4 text-amber-300" /> : item.category === 'AI' ? <SparkleIcon className="h-4 w-4 text-cyan-300" /> : item.category === 'Warning' ? <ShieldAlert className="h-4 w-4 text-rose-300" /> : item.category === 'System' ? <Info className="h-4 w-4 text-emerald-300" /> : <CheckCheck className="h-4 w-4 text-emerald-300" />}
                              <p className="text-sm font-semibold text-white">{item.title}</p>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-300">{item.message}</p>
                            <div className="mt-2 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-slate-400">
                              <span>{item.category}</span>
                              <span>{item.time}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )) : <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-400">You are all caught up.</div>}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-3">
                    <button type="button" className="text-sm font-medium text-cyan-200 transition hover:text-cyan-100">Mark all read</button>
                    <button type="button" className="text-sm font-medium text-slate-300 transition hover:text-white">Clear all</button>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="relative" ref={accountRef}>
              <button type="button" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400" aria-label="User menu" onClick={toggleAccount}>
                <UserCircle className="h-5 w-5" />
                <span className="hidden md:inline">Account</span>
              </button>
              {accountOpen ? (
                <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-[24px] border border-white/10 bg-slate-900/95 p-3 shadow-2xl shadow-black/40 backdrop-blur-xl animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/20 text-lg font-semibold text-cyan-100">{(user?.displayName ?? 'D').charAt(0).toUpperCase()}</div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{user?.displayName ?? 'Demo User'}</p>
                      <p className="truncate text-sm text-slate-400">{user?.role ? user.role.replace(/_/g, ' ') : 'citizen'}</p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <button type="button" className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-left text-sm text-slate-200 transition hover:bg-white/10" onClick={() => { closePanels(); setSettingsOpen(true); }}>
                      <Settings2 className="h-4 w-4 text-cyan-200" />
                      Settings
                    </button>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-200">Theme</span>
                        <ThemeToggle />
                      </div>
                    </div>
                    <button type="button" className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-left text-sm text-slate-200 transition hover:bg-white/10" onClick={() => { closePanels(); setHelpOpen(true); }}>
                      <Sparkles className="h-4 w-4 text-cyan-200" />
                      Help
                    </button>
                    <button type="button" className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-left text-sm text-slate-200 transition hover:bg-white/10" onClick={() => { closePanels(); setAboutOpen(true); }}>
                      <Info className="h-4 w-4 text-cyan-200" />
                      About
                    </button>
                    <button type="button" className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-left text-sm text-slate-200 transition hover:bg-white/10" onClick={() => { closePanels(); setLogoutOpen(true); }}>
                      <ShieldCheck className="h-4 w-4 text-cyan-200" />
                      Logout
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            <button type="button" className="inline-flex rounded-full border border-white/10 bg-white/5 p-2 text-slate-200 transition hover:bg-white/10 md:hidden" onClick={() => setMobileOpen((value) => !value)} aria-label="Toggle navigation">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <div className="border-t border-white/10 bg-slate-950/95 px-4 py-4 md:hidden">
            <div className="flex flex-col gap-2">
              {[...primaryItems, ...overflowItems].map((item) => (
                <MemoizedNavLink key={item.href} item={item} active={isActive(item.href)} onNavigate={() => setMobileOpen(false)} />
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
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <HelpCenterModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <LogoutConfirmModal open={logoutOpen} onClose={() => setLogoutOpen(false)} onConfirm={handleLogoutConfirm} />
    </div>
  );
}
