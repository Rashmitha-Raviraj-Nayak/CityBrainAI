export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-50">
      <div className="max-w-md rounded-[32px] border border-white/10 bg-slate-900/80 p-8 text-center shadow-glow">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">404</p>
        <h1 className="mt-3 text-2xl font-semibold">Page not found</h1>
        <p className="mt-3 text-sm text-slate-400">The route you requested isn’t available in the current operations console.</p>
      </div>
    </div>
  );
}
