"use client";

import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Clock3, TrendingUp, Sparkles, BarChart3, Gauge, Radar, Layers3 } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard-shell';
import { getIncidentDecisionSupport, getIncidentStats, subscribeToIncidents, type IncidentRecord } from '@/services/incident-service';

export default function AnalyticsPage() {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToIncidents((nextIncidents) => {
      setIncidents(nextIncidents);
    });

    return () => unsubscribe();
  }, []);

  const stats = getIncidentStats(incidents);
  const metrics = useMemo(
    () => [
      { label: 'Resolution rate', value: `${Math.max(0, Math.round((stats.reviewed / Math.max(1, stats.total)) * 100))}%`, change: '+15%', positive: true },
      { label: 'Avg. severity', value: `${stats.averageSeverity}/10`, change: '-8%', positive: false },
      { label: 'Critical alerts', value: String(stats.escalated), change: '+2', positive: true },
      { label: 'Validation score', value: incidents.length ? '0.91' : '0.00', change: '+0.03', positive: true },
    ],
    [incidents.length, stats.averageSeverity, stats.escalated, stats.reviewed, stats.total],
  );

  const categoryMix = useMemo(() => {
    const count = incidents.length || 1;
    const categories = incidents.reduce<Record<string, number>>((acc, incident) => {
      const category = incident.category || 'Infrastructure';
      acc[category] = (acc[category] ?? 0) + 1;
      return acc;
    }, {});

    return Object.entries(categories).length ? Object.entries(categories).map(([label, value]) => ({ label, value: Math.round((value / count) * 100) })) : [
      { label: 'Infrastructure', value: 46 },
      { label: 'Traffic', value: 31 },
      { label: 'Utilities', value: 23 },
    ];
  }, [incidents]);

  const departmentMix = useMemo(() => {
    const departments = incidents.reduce<Record<string, number>>((acc, incident) => {
      const support = getIncidentDecisionSupport(incident);
      const department = support.department || incident.department || 'Operations';
      acc[department] = (acc[department] ?? 0) + 1;
      return acc;
    }, {});

    return Object.entries(departments).length ? Object.entries(departments).map(([label, value]) => ({ label, value })) : [
      { label: 'Public Works', value: 2 },
      { label: 'Utilities', value: 1 },
      { label: 'Traffic', value: 1 },
    ];
  }, [incidents]);

  const severityMix = useMemo(() => [
    { label: 'Low', value: incidents.filter((incident) => (incident.severity_hint ?? 0) <= 4).length },
    { label: 'Medium', value: incidents.filter((incident) => (incident.severity_hint ?? 0) > 4 && (incident.severity_hint ?? 0) < 8).length },
    { label: 'High', value: incidents.filter((incident) => (incident.severity_hint ?? 0) >= 8).length },
  ], [incidents]);

  return (
    <DashboardShell>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-[24px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
            <div className="flex items-center justify-between">
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">{metric.label}</p>
              {metric.positive ? <ArrowUpRight className="h-4 w-4 text-emerald-300" /> : <ArrowDownRight className="h-4 w-4 text-amber-300" />}
            </div>
            <p className="mt-3 text-3xl font-semibold text-white">{metric.value}</p>
            <p className={`mt-2 text-sm ${metric.positive ? 'text-emerald-300' : 'text-amber-300'}`}>{metric.change} vs previous window</p>
          </div>
        ))}
      </div>
      <div className="mt-8 grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[32px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-200">Incident trends</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Operational momentum</h2>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-200"><Sparkles className="h-4 w-4" />Live data</div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              { label: 'Signal intake', value: incidents.length || 0, icon: Activity },
              { label: 'Response time', value: '6 min', icon: Clock3 },
              { label: 'Risk posture', value: 'Elevated', icon: TrendingUp },
            ].map((item) => (
              <div key={item.label} className="rounded-[20px] border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/40">
                <item.icon className="h-5 w-5 text-cyan-200" />
                <p className="mt-3 text-2xl font-semibold text-white">{item.value}</p>
                <p className="mt-1 text-sm text-slate-400">{item.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-[24px] border border-white/10 bg-slate-950/70 p-4">
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>Incident categories</span>
              <span className="text-cyan-200">Live mix</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {categoryMix.map((category) => (
                <div key={category.label} className="rounded-[20px] border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span>{category.label}</span>
                    <span className="font-semibold text-white">{category.value}%</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-slate-800">
                    <div className="h-2 rounded-full bg-cyan-400" style={{ width: `${category.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {severityMix.map((item) => (
              <div key={item.label} className="rounded-[20px] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-cyan-200"><Gauge className="h-4 w-4" /> {item.label}</div>
                <p className="mt-3 text-2xl font-semibold text-white">{item.value}</p>
                <p className="mt-1 text-sm text-slate-400">severity band</p>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-[32px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-200">Department performance</p>
          <div className="mt-6 space-y-3">
            {departmentMix.map(({ label, value }) => {
              const score = `${Math.min(100, 70 + value * 8)}%`;
              return (
                <div key={label} className="rounded-[20px] border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                  <div className="flex items-center justify-between">
                    <span>{label}</span>
                    <span className="font-semibold text-white">{value} incident{value === 1 ? '' : 's'}</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-slate-800">
                    <div className="h-2 rounded-full bg-emerald-400" style={{ width: score }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 rounded-[24px] border border-white/10 bg-slate-950/70 p-4">
            <div className="flex items-center gap-2 text-cyan-200"><BarChart3 className="h-4 w-4" /> Workload outlook</div>
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3"><span>Top risk areas</span><span className="font-semibold text-white">Market Street</span></div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3"><span>Prediction accuracy</span><span className="font-semibold text-white">0.91</span></div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3"><span>AI confidence trend</span><span className="font-semibold text-white">+0.04</span></div>
            </div>
          </div>
        </section>
      </div>
      <section className="mt-8 rounded-[32px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
        <div className="flex items-center gap-2 text-amber-300"><AlertTriangle className="h-4 w-4" /> <span className="text-sm uppercase tracking-[0.25em]">Operational note</span></div>
        {incidents.length ? (
          <p className="mt-3 text-sm leading-7 text-slate-300">
            The platform is tracking {incidents.length} incidents with an average severity of {stats.averageSeverity}/10 and {stats.pending} still awaiting review.
          </p>
        ) : (
          <div className="mt-4 rounded-[24px] border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            No incident data has been submitted yet. Report the first incident to populate live analytics.
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
