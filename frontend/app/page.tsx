import Link from 'next/link';
import { ArrowRight, Cpu, ShieldCheck, Sparkles } from 'lucide-react';

const highlights = [
  'Predictive triage and risk scoring',
  'Live incident intelligence workflow',
  'Officer copilot recommendations',
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.25),_transparent_45%)] px-6 py-16 text-slate-50 sm:px-8 lg:px-12">
      <section className="mx-auto flex max-w-7xl flex-col gap-10 rounded-[32px] border border-white/10 bg-slate-900/70 p-8 shadow-glow backdrop-blur xl:flex-row xl:items-center xl:p-14">
        <div className="flex-1 space-y-8">
          <div className="inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-sm font-medium text-cyan-200">
            CityBrain OS • AI Operations Platform
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Predictive civic operations for every incident.
            </h1>
            <p className="max-w-2xl text-lg text-slate-300 sm:text-xl">
              A premium, Google-inspired operations experience that unifies vision, understanding,
              prediction, and decision intelligence for modern public safety teams.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-cyan-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              Open Operations Console
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/report"
              className="rounded-full border border-white/15 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              Submit a Live Incident
            </Link>
          </div>
          <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
            <Link href="/workflow" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-cyan-400/40 hover:bg-cyan-500/10">
              Agent workflow
            </Link>
            <Link href="/explainability" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-cyan-400/40 hover:bg-cyan-500/10">
              Explainability trace
            </Link>
            <Link href="/admin" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-cyan-400/40 hover:bg-cyan-500/10">
              Supervisor view
            </Link>
          </div>
          <ul className="grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
            {highlights.map((item) => (
              <li key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex-1 rounded-[28px] border border-white/10 bg-slate-950/70 p-6">
          <div className="rounded-[24px] border border-cyan-400/20 bg-gradient-to-br from-cyan-500/15 via-slate-900 to-slate-800 p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-cyan-200">Live workflow</p>
                <p className="text-2xl font-semibold">Supervisor • Vision • Prediction</p>
              </div>
              <div className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm text-emerald-300">
                Online
              </div>
            </div>
            <div className="space-y-4">
              {["Vision Agent", "Understanding Agent", "Prediction Agent", "Decision Agent"].map((agent, index) => (
                <div key={agent} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <span>{agent}</span>
                  <span className="text-sm text-slate-400">0.{index + 8}s</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
