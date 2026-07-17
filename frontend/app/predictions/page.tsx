import { AlertTriangle, Gauge, ShieldCheck } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard-shell';

const predictions = [
  { title: 'Drainage overflow', risk: 'High', confidence: '0.91', priority: 'Immediate', responseTime: '8 min', population: '4,200', department: 'Public Works', escalation: 'High' },
  { title: 'Traffic congestion', risk: 'Medium', confidence: '0.83', priority: 'Scheduled', responseTime: '15 min', population: '1,100', department: 'Traffic', escalation: 'Moderate' },
  { title: 'Power disruption', risk: 'High', confidence: '0.88', priority: 'Urgent', responseTime: '10 min', population: '3,600', department: 'Utilities', escalation: 'High' },
];

export default function PredictionsPage() {
  return (
    <DashboardShell>
      <section className="rounded-[32px] border border-white/10 bg-slate-900/70 p-8 shadow-glow backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Prediction center</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Risk forecasting and confidence scoring</h2>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">
            <ShieldCheck className="h-4 w-4" />
            Live model outputs
          </div>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {predictions.map((prediction) => (
            <div key={prediction.title} className="rounded-[24px] border border-white/10 bg-white/5 p-5 transition hover:-translate-y-1 hover:border-cyan-400/40">
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold text-white">{prediction.title}</p>
                <div className="rounded-full bg-cyan-500/10 p-2 text-cyan-200">
                  <Gauge className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                  <div className="flex items-center justify-between"><span>Risk score</span><span className="font-semibold text-white">{prediction.risk}</span></div>
                  <div className="mt-2 h-2 rounded-full bg-slate-800"><div className="h-2 rounded-full bg-amber-400" style={{ width: prediction.risk === 'High' ? '86%' : '64%' }} /></div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                  <div className="flex items-center justify-between"><span>Confidence</span><span className="font-semibold text-white">{prediction.confidence}</span></div>
                  <div className="mt-2 h-2 rounded-full bg-slate-800"><div className="h-2 rounded-full bg-cyan-400" style={{ width: `${Number(prediction.confidence) * 100}%` }} /></div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                  <div className="flex items-center justify-between"><span>Response time</span><span className="font-semibold text-white">{prediction.responseTime}</span></div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                  <div className="flex items-center justify-between"><span>Affected population</span><span className="font-semibold text-white">{prediction.population}</span></div>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-sm text-slate-300">
                <div className="flex items-center gap-2 text-cyan-200">
                  <AlertTriangle className="h-4 w-4" />
                  Escalation risk: {prediction.escalation}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </DashboardShell>
  );
}
