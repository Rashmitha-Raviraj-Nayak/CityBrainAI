export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-50" aria-busy="true">
      <div className="rounded-[32px] border border-white/10 bg-slate-900/80 px-8 py-6 text-center shadow-glow">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Loading</p>
        <p className="mt-2 text-lg font-semibold">Preparing your operations workspace…</p>
        <div className="mt-4 h-2 w-40 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-cyan-400" />
        </div>
      </div>
    </div>
  );
}
