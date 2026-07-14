"use client";

import { useMemo, useState } from 'react';
import { DashboardShell } from '@/components/dashboard-shell';
import { runRuntime, type RuntimeRequest } from '@/lib/api';

const defaultValues: RuntimeRequest = {
  title: 'Blocked storm drain causing localized flooding',
  description: 'Heavy rain has overwhelmed a drainage inlet and water is pooling near the intersection.',
  category: 'infrastructure',
  location: 'Downtown District',
  source: 'citizen_report',
  severity_hint: 7,
  metadata: {
    channel: 'web',
    priority: 'high',
  },
};

export default function ReportIncidentPage() {
  const [form, setForm] = useState<RuntimeRequest>(defaultValues);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof runRuntime>> | null>(null);

  const preview = useMemo(() => ({
    title: form.title || 'Untitled report',
    category: form.category || 'Uncategorized',
    severity: form.severity_hint ?? 0,
    location: form.location || 'Unknown location',
  }), [form]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await runRuntime(form);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to process incident');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardShell>
      <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[32px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Report incident</p>
              <h2 className="text-2xl font-semibold text-white">Citizen intake and triage</h2>
            </div>
            <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">
              Live workflow
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-slate-300">
                <span>Signal title</span>
                <input className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                <span>Category</span>
                <input className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
              </label>
            </div>
            <label className="block space-y-2 text-sm text-slate-300">
              <span>Description</span>
              <textarea className="min-h-28 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-slate-300">
                <span>Location</span>
                <input className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
              </label>
              <label className="space-y-2 text-sm text-slate-300">
                <span>Severity hint</span>
                <input type="number" min="0" max="10" className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none" value={form.severity_hint} onChange={(event) => setForm({ ...form, severity_hint: Number(event.target.value) })} />
              </label>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              <p className="mb-3 font-semibold text-white">Multi-modal intake</p>
              <div className="flex flex-wrap gap-3">
                <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-cyan-200">Image upload</span>
                <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-cyan-200">Video upload</span>
                <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-cyan-200">Voice recording</span>
                <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-cyan-200">GPS tagging</span>
              </div>
            </div>
            <button type="submit" disabled={loading} className="rounded-full bg-cyan-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70">
              {loading ? 'Running workflow…' : 'Submit report'}
            </button>
          </form>
          {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
        </section>

        <section className="space-y-6">
          <div className="rounded-[32px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Report preview</p>
            <div className="mt-4 rounded-[24px] border border-white/10 bg-slate-950/70 p-4">
              <p className="text-xl font-semibold text-white">{preview.title}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-300">
                <span className="rounded-full border border-white/10 px-3 py-1">{preview.category}</span>
                <span className="rounded-full border border-white/10 px-3 py-1">Severity {preview.severity}/10</span>
                <span className="rounded-full border border-white/10 px-3 py-1">{preview.location}</span>
              </div>
            </div>
          </div>
          {result ? (
            <div className="rounded-[32px] border border-cyan-400/20 bg-cyan-500/10 p-6 text-sm text-slate-200 shadow-glow backdrop-blur">
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Execution output</p>
              <div className="mt-4 space-y-3">
                <div className="rounded-[20px] border border-white/10 bg-slate-950/70 p-4">
                  <p className="font-semibold text-white">Decision</p>
                  <p className="mt-2 text-slate-300">{result.decision.recommended_action}</p>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-slate-950/70 p-4">
                  <p className="font-semibold text-white">Confidence</p>
                  <p className="mt-2 text-slate-300">{Math.round(result.decision.confidence * 100)}%</p>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-slate-950/70 p-4">
                  <p className="font-semibold text-white">Validation</p>
                  <p className="mt-2 text-slate-300">{result.validation.is_valid ? 'Approved' : 'Needs review'}</p>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </DashboardShell>
  );
}
