"use client";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-50">
      <div className="max-w-lg rounded-[32px] border border-rose-400/20 bg-slate-900/80 p-8 text-center shadow-glow" role="alert">
        <p className="text-sm uppercase tracking-[0.3em] text-rose-300">Unexpected error</p>
        <h1 className="mt-3 text-2xl font-semibold">The page could not be rendered.</h1>
        <p className="mt-3 text-sm text-slate-400">Please refresh the page or try again in a moment.</p>
        {error?.message ? <p className="mt-3 text-sm text-rose-200">{error.message}</p> : null}
        <button onClick={() => reset()} className="mt-6 rounded-full bg-cyan-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-cyan-400">
          Try again
        </button>
      </div>
    </div>
  );
}
