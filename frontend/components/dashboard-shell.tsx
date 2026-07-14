import type { Route } from 'next';
import Link from 'next/link';

const navItems: Array<{ href: Route; label: string }> = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/report', label: 'Report Incident' },
  { href: '/workflow', label: 'AI Workflow' },
  { href: '/incident-intelligence', label: 'Incident Intelligence' },
  { href: '/incident-details', label: 'Incident Details' },
  { href: '/predictions', label: 'Prediction Center' },
  { href: '/decisions', label: 'Decision Center' },
  { href: '/explainability', label: 'Explainability' },
  { href: '/admin', label: 'Admin' },
  { href: '/officer-copilot', label: 'Officer Copilot' },
  { href: '/map', label: 'Interactive Map' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/departments', label: 'Departments' },
  { href: '/settings', label: 'Settings' },
  { href: '/about', label: 'About' },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_35%)] text-slate-50">
      <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-8 lg:px-12">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-200">CityBrain OS</p>
            <h1 className="text-lg font-semibold">Operations Console</h1>
          </div>
          <nav className="flex gap-2 rounded-full border border-white/10 bg-white/5 p-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-12">{children}</main>
    </div>
  );
}
