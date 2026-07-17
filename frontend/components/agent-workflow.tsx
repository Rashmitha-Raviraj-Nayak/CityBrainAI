"use client";

import { CheckCircle2, LoaderCircle, Sparkles } from 'lucide-react';

type WorkflowStage = 'idle' | 'uploading' | 'analyzing' | 'persisting' | 'complete';

const workflowSteps = [
  { label: 'Citizen Report', detail: 'Capture the incident signal' },
  { label: 'Vision Agent', detail: 'Detect visual evidence and urgency' },
  { label: 'Understanding Agent', detail: 'Classify the incident context' },
  { label: 'Prediction Agent', detail: 'Forecast risk and exposure' },
  { label: 'Decision Agent', detail: 'Recommend a response path' },
  { label: 'Supervisor Agent', detail: 'Route and coordinate the workflow' },
  { label: 'Final Recommendation', detail: 'Deliver the action plan' },
];

function getTimestamp(index: number) {
  const base = new Date();
  base.setMinutes(base.getMinutes() + index * 2);
  return base.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function AgentWorkflowTimeline({ stage, confidence }: { stage: WorkflowStage; confidence?: number }) {
  const progress = stage === 'idle' ? 0 : stage === 'uploading' ? 18 : stage === 'analyzing' ? 58 : stage === 'persisting' ? 86 : 100;
  const activeIndex = stage === 'idle' ? 0 : stage === 'uploading' ? 0 : stage === 'analyzing' ? 2 : stage === 'persisting' ? 5 : 6;
  const statusText = stage === 'complete' ? 'Completed' : stage === 'idle' ? 'Ready' : 'Processing';

  return (
    <section className="rounded-[24px] border border-cyan-400/20 bg-cyan-500/10 p-4" aria-label="Multi-agent workflow visualization">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Live AI workflow</p>
          <h3 className="mt-1 text-lg font-semibold text-white">Multi-agent execution in motion</h3>
        </div>
        <div className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-sm text-cyan-100">
          {statusText}
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-950/70">
        <div className="h-2 rounded-full bg-cyan-400 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {workflowSteps.map((step, index) => {
          const isCompleted = index < activeIndex;
          const isCurrent = index === activeIndex;
          const status = isCompleted ? 'Completed' : isCurrent ? (stage === 'complete' ? 'Completed' : 'Processing') : 'Queued';
          const duration = index < activeIndex ? `${Math.max(0, 1 + index)}.2s` : index === activeIndex ? 'Live' : 'Pending';
          return (
            <div key={step.label} className={`rounded-[20px] border p-3 ${isCurrent ? 'border-cyan-400/30 bg-slate-950/70' : 'border-white/10 bg-white/5'}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-white">{step.label}</p>
                  <p className="mt-1 text-xs text-slate-400">{step.detail}</p>
                </div>
                {isCompleted ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : isCurrent ? <LoaderCircle className="h-4 w-4 animate-spin text-cyan-200" /> : <Sparkles className="h-4 w-4 text-slate-400" />}
              </div>
              <div className="mt-3 rounded-full border border-white/10 px-2 py-1 text-center text-[11px] uppercase tracking-[0.25em] text-slate-300">
                {status}
              </div>
              <div className="mt-2 text-[11px] text-slate-400">
                {getTimestamp(index)} • {duration}
              </div>
            </div>
          );
        })}
      </div>

      {typeof confidence === 'number' ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-200">
          <span className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1">Confidence {Math.round(confidence * 100)}%</span>
          <span className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1">Execution time tracked live</span>
        </div>
      ) : null}
    </section>
  );
}
