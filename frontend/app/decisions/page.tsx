import { ChevronRight, Clock3, ClipboardList, ShieldCheck, Truck } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard-shell';

const recommendations = [
  { title: 'Dispatch field team', priority: 'High', resources: '2 units', department: 'Public Works', timeline: '15 min', outcome: 'Reduced water accumulation and safer traffic flow', personnel: '6 operators', vehicles: '2 utility trucks', cost: '$8,400' },
  { title: 'Escalate utility inspection', priority: 'Medium', resources: '1 unit', department: 'Utilities', timeline: '30 min', outcome: 'Prevented further power disruption and restored service', personnel: '3 operators', vehicles: '1 inspection van', cost: '$4,200' },
];

export default function DecisionsPage() {
  return (
    <DashboardShell>
      <section className="rounded-[32px] border border-white/10 bg-slate-900/70 p-8 shadow-glow backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Decision support</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Operational recommendations and policy alignment</h2>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-200">
            <ShieldCheck className="h-4 w-4" />
            Explainable actions
          </div>
        </div>
        <div className="mt-6 space-y-4">
          {recommendations.map((recommendation) => (
            <details key={recommendation.title} className="rounded-[24px] border border-white/10 bg-white/5 p-5" open>
              <summary className="flex cursor-pointer items-center justify-between gap-3 text-lg font-semibold text-white">
                <span>{recommendation.title}</span>
                <div className="flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-200">
                  <span>{recommendation.priority}</span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </summary>
              <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
                <div className="rounded-[20px] border border-white/10 bg-slate-950/70 p-4"><p className="text-xs uppercase tracking-[0.3em] text-slate-400">Reason</p><p className="mt-2">Priority routing based on live risk signals and departmental load.</p></div>
                <div className="rounded-[20px] border border-white/10 bg-slate-950/70 p-4"><p className="text-xs uppercase tracking-[0.3em] text-slate-400">Resources</p><p className="mt-2">{recommendation.resources}</p></div>
                <div className="rounded-[20px] border border-white/10 bg-slate-950/70 p-4"><p className="text-xs uppercase tracking-[0.3em] text-slate-400">Departments</p><p className="mt-2">{recommendation.department}</p></div>
                <div className="rounded-[20px] border border-white/10 bg-slate-950/70 p-4"><p className="text-xs uppercase tracking-[0.3em] text-slate-400">Timeline</p><p className="mt-2">{recommendation.timeline}</p></div>
                <div className="rounded-[20px] border border-white/10 bg-slate-950/70 p-4"><div className="flex items-center gap-2 text-cyan-200"><Truck className="h-4 w-4" />Vehicles</div><p className="mt-2">{recommendation.vehicles}</p></div>
                <div className="rounded-[20px] border border-white/10 bg-slate-950/70 p-4"><div className="flex items-center gap-2 text-cyan-200"><ClipboardList className="h-4 w-4" />Personnel</div><p className="mt-2">{recommendation.personnel}</p></div>
                <div className="rounded-[20px] border border-white/10 bg-slate-950/70 p-4"><div className="flex items-center gap-2 text-cyan-200"><Clock3 className="h-4 w-4" />Estimated cost</div><p className="mt-2">{recommendation.cost}</p></div>
                <div className="rounded-[20px] border border-white/10 bg-slate-950/70 p-4"><div className="flex items-center gap-2 text-cyan-200"><ShieldCheck className="h-4 w-4" />Expected impact</div><p className="mt-2">{recommendation.outcome}</p></div>
              </div>
            </details>
          ))}
        </div>
      </section>
    </DashboardShell>
  );
}
