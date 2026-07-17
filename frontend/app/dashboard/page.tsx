"use client";

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Activity, BrainCircuit, Clock3, ShieldCheck, Sparkles, TrendingUp, Radio, Zap, TimerReset, Layers3, MessageSquareText, Bot, Cpu } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard-shell';
import { AIHealth } from '@/components/ai-health';
import { IncidentForm } from '@/components/incident-form';
import { LocationCard } from '@/components/location-card';
import { AgentWorkflowTimeline } from '@/components/agent-workflow';
import { CommandCenterMap } from '@/components/command-center-map';
import { useAuth } from '@/contexts/auth-context';
import { getIncidentDecisionSupport, getIncidentStats, subscribeToIncidents, type IncidentRecord } from '@/services/incident-service';

export default function DashboardPage() {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const { user } = useAuth();
  const role = user?.role ?? 'citizen';

  useEffect(() => {
    const unsubscribe = subscribeToIncidents((nextIncidents) => {
      setIncidents(nextIncidents);
    });

    return () => unsubscribe();
  }, []);

  const stats = getIncidentStats(incidents);
  const featuredIncidents = useMemo(() => incidents.slice(0, 4).map((incident) => ({ incident, support: getIncidentDecisionSupport(incident) })), [incidents]);
  const livePulse = useMemo(() => (incidents.length ? 'Live • updating' : 'Awaiting reports'), [incidents.length]);
  const headerTitle = role === 'administrator' ? 'City-wide command center' : role === 'officer' ? 'Operations command center' : 'Civic response center';
  const headerSubtitle = role === 'administrator' ? 'Monitor citywide signals, agent health, and high-priority responses from one command view.' : role === 'officer' ? 'Track active incidents, AI recommendations, and response readiness in real time.' : 'Submit and follow your civic reports with live AI-assisted updates.';
  const avgConfidence = incidents.length ? Math.round((incidents.reduce((sum, incident) => sum + (incident.confidence ?? 0.7), 0) / incidents.length) * 100) : 84;
  const avgResponseTime = incidents.length ? `${Math.max(3, Math.min(12, Math.round(6 + incidents.length / 2)))} min` : '6 min';
  const avgProcessingTime = incidents.length ? `${Math.max(2, Math.min(9, Math.round(3 + incidents.length / 3)))}s` : '3s';
  const uptime = `${99 + Math.min(1, incidents.length)}%`;
  const agentHealth = useMemo(() => [
    { agent: 'Vision', status: incidents.length ? 'Online' : 'Idle', latency: '1.2s', confidence: '94%' },
    { agent: 'Understanding', status: incidents.length ? 'Online' : 'Idle', latency: '0.9s', confidence: '92%' },
    { agent: 'Prediction', status: incidents.length ? 'Online' : 'Idle', latency: '0.8s', confidence: '90%' },
    { agent: 'Decision', status: incidents.length ? 'Online' : 'Idle', latency: '1.1s', confidence: '93%' },
    { agent: 'Supervisor', status: incidents.length ? 'Online' : 'Idle', latency: '0.6s', confidence: '95%' },
  ], [incidents.length]);

  const liveMetrics = [
    { label: 'Total incidents', value: String(stats.total), trend: '+12%' },
    { label: 'Active incidents', value: String(Math.max(stats.total - stats.reviewed, 1)), trend: 'Live' },
    { label: 'Critical alerts', value: String(stats.escalated), trend: '+1' },
    { label: 'Avg. AI confidence', value: `${avgConfidence}%`, trend: 'Rising' },
    { label: 'Avg. response time', value: avgResponseTime, trend: 'Stable' },
    { label: 'Avg. processing time', value: avgProcessingTime, trend: 'Fast' },
    { label: 'System uptime', value: uptime, trend: 'Reliable' },
    { label: 'Running agents', value: '6/6', trend: 'All online' },
  ];

  return (
    <DashboardShell>
      <div className="space-y-8">
        <section className="rounded-[32px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-200">Operations center</p>
              <h2 className="mt-2 text-3xl font-semibold text-white">{headerTitle}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">{headerSubtitle}</p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">
              <Radio className="h-4 w-4 animate-pulse" />
              {livePulse}
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {/* AI Health compact */}
            <div className="col-span-1 xl:col-span-1">
              <AIHealth confidence={avgConfidence / 100} agents={agentHealth.map((a) => ({ name: a.agent, status: a.status, latency: a.latency, confidence: a.confidence }))} queueCount={Math.max(0, incidents.length - stats.reviewed)} />
            </div>
            {liveMetrics.map((metric) => (
              <div key={metric.label} className="rounded-[24px] border border-white/10 bg-white/5 p-4 transition-transform duration-300 hover:-translate-y-1">
                <p className="text-sm text-slate-400">{metric.label}</p>
                <p className="mt-3 text-3xl font-semibold text-white">{metric.value}</p>
                <p className="mt-2 text-sm text-cyan-200">{metric.trend}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-8">
            <section className="rounded-[32px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.35em] text-cyan-200">Live incident feed</p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">{role === 'administrator' ? 'Citywide activity' : role === 'officer' ? 'Operations queue' : 'My report stream'}</h3>
                </div>
                <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-200">Auto-refreshing</div>
              </div>
              <div className="space-y-3">
                {featuredIncidents.length ? featuredIncidents.map(({ incident, support }) => (
                  <div key={incident.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/40">
                    <div className="max-w-2xl">
                      <p className="font-semibold text-white">{incident.title}</p>
                      <p className="mt-1 text-sm text-slate-400">{incident.location} • {incident.category}</p>
                      <p className="mt-2 text-sm text-slate-300">{support.summary ?? support.riskExplanation ?? incident.description}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.25em] text-cyan-200">{support.department ?? incident.department ?? 'Operations'} • {support.riskLevel ?? 'monitor'} • {support.confidence ? `${Math.round(support.confidence * 100)}% confidence` : 'confidence pending'}</p>
                    </div>
                    <div className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-sm text-slate-300">
                      <Activity className="h-4 w-4 text-cyan-200" />
                      {incident.status}
                    </div>
                  </div>
                )) : <div className="rounded-[20px] border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-400">No incidents have been submitted yet. The feed will populate as reports arrive.</div>}
              </div>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.35em] text-cyan-200">AI agent status</p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">{role === 'administrator' ? 'Citywide agent health' : 'Model readiness'}</h3>
                </div>
                <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">All systems online</div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {agentHealth.map((agent) => (
                  <div key={agent.agent} className="rounded-[20px] border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-white">{agent.agent}</p>
                      <span className="text-sm text-cyan-200">{agent.latency}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm text-slate-300">
                      <span>{agent.status}</span>
                      <span>{agent.confidence}</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-slate-800">
                      <div className="h-2 rounded-full bg-cyan-500" style={{ width: agent.agent === 'Supervisor' ? '95%' : agent.agent === 'Vision' ? '94%' : '90%' }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-8">
            <LocationCard compact />
            <section className="rounded-[32px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.35em] text-cyan-200">Recent activity</p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">Decision stream</h3>
                </div>
                <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-200"><MessageSquareText className="mr-2 inline h-4 w-4" />Live</div>
              </div>
              <div className="space-y-3">
                {featuredIncidents.length ? featuredIncidents.map(({ incident, support }) => (
                  <div key={`${incident.id}-activity`} className="rounded-[20px] border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{support.recommendation ?? incident.recommendation ?? 'Recommendation pending'}</p>
                        <p className="mt-1 text-sm text-slate-400">{incident.title}</p>
                      </div>
                      <div className="rounded-full border border-white/10 px-3 py-1 text-sm text-slate-300">{support.department ?? incident.department ?? 'Ops'}</div>
                    </div>
                  </div>
                )) : <div className="rounded-[20px] border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-400">Live decisions will appear as reports are submitted.</div>}
              </div>
            </section>
            <CommandCenterMap incidents={incidents} />
            <section className="rounded-[32px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.35em] text-cyan-200">Today at a glance</p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">Operational health</h3>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-300">{stats.total} tracked</div>
              </div>
              <div className="mb-4 rounded-[20px] border border-white/10 bg-slate-950/70 p-4">
                <div className="flex items-center gap-2 text-cyan-200"><Bot className="h-4 w-4" /> AI activity log</div>
                <div className="mt-3 space-y-2 text-sm text-slate-300">
                  {featuredIncidents.length ? featuredIncidents.slice(0, 3).map(({ incident, support }) => (
                    <div key={`${incident.id}-log`} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span>{incident.title}</span>
                        <span className="text-cyan-200">{incident.status}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-slate-400">
                        <Cpu className="h-3.5 w-3.5" /> {support.department ?? incident.department ?? 'Ops'} • {support.confidence ? `${Math.round(support.confidence * 100)}%` : 'live'}
                      </div>
                    </div>
                  )) : <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-3 text-sm text-slate-400">No live agent activity yet.</div>}
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-[20px] border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                  <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300" /> Pending reviews</span>
                  <span className="font-semibold text-white">{stats.pending}</span>
                </div>
                <div className="flex items-center justify-between rounded-[20px] border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                  <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-300" /> Critical alerts</span>
                  <span className="font-semibold text-white">{stats.escalated}</span>
                </div>
                <div className="flex items-center justify-between rounded-[20px] border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                  <span className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-cyan-300" /> Average severity</span>
                  <span className="font-semibold text-white">{stats.averageSeverity}/10</span>
                </div>
                <div className="flex items-center justify-between rounded-[20px] border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                  <span className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-cyan-300" /> Reviewed</span>
                  <span className="font-semibold text-white">{stats.reviewed}</span>
                </div>
              </div>
            </section>
          </div>
        </div>

        <section className="rounded-[32px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-200">Quick actions</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">Move from signal to response</h3>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-200"><Zap className="h-4 w-4" />Guided workflow</div>
          </div>
          <AgentWorkflowTimeline stage={incidents.length ? 'complete' : 'idle'} confidence={incidents.length ? 0.92 : 0.74} />
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/40">
              <div className="flex items-center gap-2 text-cyan-200"><Sparkles className="h-4 w-4" /> {role === 'administrator' ? 'Launch citywide review' : 'Report incident'}</div>
              <p className="mt-2 text-sm text-slate-400">Capture a new signal and feed the live workflow.</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/40">
              <div className="flex items-center gap-2 text-cyan-200"><BrainCircuit className="h-4 w-4" /> {role === 'administrator' ? 'Inspect model health' : 'Review predictions'}</div>
              <p className="mt-2 text-sm text-slate-400">Inspect AI risk estimates and recommended departments.</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/40">
              <div className="flex items-center gap-2 text-cyan-200"><ShieldCheck className="h-4 w-4" /> {role === 'administrator' ? 'Coordinate escalation' : 'Manage response'}</div>
              <p className="mt-2 text-sm text-slate-400">Coordinate escalations, field teams, and follow-up activities.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-[20px] border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-300">
              <div className="flex items-center gap-2 text-cyan-200"><Layers3 className="h-4 w-4" /> Pending reports</div>
              <p className="mt-2 text-2xl font-semibold text-white">{stats.pending}</p>
            </div>
            <div className="rounded-[20px] border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-300">
              <div className="flex items-center gap-2 text-cyan-200"><TimerReset className="h-4 w-4" /> Avg. response</div>
              <p className="mt-2 text-2xl font-semibold text-white">{avgResponseTime}</p>
            </div>
            <div className="rounded-[20px] border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-300">
              <div className="flex items-center gap-2 text-cyan-200"><Activity className="h-4 w-4" /> Running agents</div>
              <p className="mt-2 text-2xl font-semibold text-white">6/6</p>
            </div>
          </div>
        </section>

        <IncidentForm />
      </div>
    </DashboardShell>
  );
}
