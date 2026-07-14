"use client";

import { useState } from 'react';
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

export function IncidentForm() {
  const [form, setForm] = useState<RuntimeRequest>(defaultValues);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof runRuntime>> | null>(null);

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
    <section className="rounded-[28px] border border-white/10 bg-slate-900/70 p-6 shadow-glow backdrop-blur">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-300">
            <span>Signal title</span>
            <input
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none ring-0"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </label>
          <label className="space-y-2 text-sm text-slate-300">
            <span>Category</span>
            <input
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none ring-0"
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
            />
          </label>
        </div>
        <label className="block space-y-2 text-sm text-slate-300">
          <span>Description</span>
          <textarea
            className="min-h-28 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none ring-0"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-300">
            <span>Location</span>
            <input
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none ring-0"
              value={form.location}
              onChange={(event) => setForm({ ...form, location: event.target.value })}
            />
          </label>
          <label className="space-y-2 text-sm text-slate-300">
            <span>Severity hint</span>
            <input
              type="number"
              min="0"
              max="10"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none ring-0"
              value={form.severity_hint}
              onChange={(event) => setForm({ ...form, severity_hint: Number(event.target.value) })}
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-cyan-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? 'Running workflow…' : 'Run runtime'}
        </button>
      </form>

      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}

      {result ? (
        <div className="mt-6 rounded-[24px] border border-cyan-400/20 bg-cyan-500/10 p-4 text-sm text-slate-200">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-semibold text-white">Decision summary</p>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-cyan-200">
              {result.decision.risk_level}
            </span>
          </div>
          <p className="text-slate-300">{result.decision.recommended_action}</p>
          <p className="mt-2 text-sm text-cyan-100">Confidence {Math.round(result.decision.confidence * 100)}%</p>
        </div>
      ) : null}
    </section>
  );
}
