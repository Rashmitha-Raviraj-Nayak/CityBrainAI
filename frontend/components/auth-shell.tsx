"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { isFirebaseConfigured } from '@/firebase/config';
import { getRoleRedirect, resetPassword, signInWithEmail, signInWithGoogle, registerWithEmail, type UserRole } from '@/services/auth-service';

export function AuthShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('citizen');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const savedPreference = window.localStorage.getItem('citybrain-remember-me');
    if (savedPreference !== null) {
      setRememberMe(savedPreference === 'true');
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('citybrain-remember-me', String(rememberMe));
    }
  }, [rememberMe]);

  useEffect(() => {
    if (!loading && user) {
      const destination = getRoleRedirect(user.role);
      if (destination !== '/report') {
        router.replace(destination);
      }
    }
  }, [loading, user, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setInfo(null);

    try {
      if (mode === 'reset') {
        await resetPassword(email);
        setInfo('Password reset email sent.');
      } else if (mode === 'register') {
        await registerWithEmail(email, password, name, role);
        setInfo('Account created. Please verify your email inbox.');
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    if (!isFirebaseConfigured) {
      return <>{children}</>;
    }
    return <div className="flex min-h-screen items-center justify-center text-slate-100">Loading authentication…</div>;
  }

  if (user) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-slate-50">
      <a href="#auth-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-cyan-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-950">
        Skip to authentication form
      </a>
      <div id="auth-content" className="w-full max-w-md rounded-[32px] border border-white/10 bg-slate-900/80 p-8 shadow-glow">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-200">CityBrain</p>
          <h1 className="mt-2 text-2xl font-semibold">Secure operations access</h1>
          <p className="mt-2 text-sm text-slate-400">Sign in to manage incidents, analytics, and response workflows.</p>
        </div>
        <div className="mb-4 flex gap-2 text-sm">
          {(['login', 'register', 'reset'] as const).map((option) => (
            <button key={option} type="button" onClick={() => setMode(option)} className={`rounded-full px-3 py-2 ${mode === option ? 'bg-cyan-500 text-slate-950' : 'bg-white/10 text-slate-300'}`}>
              {option === 'login' ? 'Login' : option === 'register' ? 'Register' : 'Reset'}
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' ? (
            <>
              <label className="sr-only" htmlFor="full-name">Full name</label>
              <input id="full-name" className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none ring-0 transition focus:border-cyan-400" placeholder="Full name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} />
              <label className="sr-only" htmlFor="role-select">Role</label>
              <select id="role-select" value={role} onChange={(event) => setRole(event.target.value as UserRole)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400">
                <option value="citizen">Citizen</option>
                <option value="officer">Officer</option>
                <option value="department_head">Department Head</option>
                <option value="administrator">Administrator</option>
              </select>
            </>
          ) : null}
          <label className="sr-only" htmlFor="auth-email">Email</label>
          <input id="auth-email" className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400" placeholder="Email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          {mode !== 'reset' ? <><label className="sr-only" htmlFor="auth-password">Password</label><input id="auth-password" className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400" placeholder="Password" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} /></> : null}
          {mode !== 'reset' ? (
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={rememberMe} onChange={() => setRememberMe((value) => !value)} className="h-4 w-4 rounded border-white/10 bg-slate-950" />
              Remember me
            </label>
          ) : null}
          <button type="submit" disabled={submitting} className="w-full rounded-full bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-70">
            {submitting ? 'Working…' : mode === 'register' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in'}
          </button>
        </form>
        {error ? <p className="mt-3 text-sm text-rose-300" role="alert">{error}</p> : null}
        {info ? <p className="mt-3 text-sm text-emerald-300" aria-live="polite">{info}</p> : null}
        <button type="button" onClick={handleGoogle} disabled={submitting} className="mt-4 w-full rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm transition hover:bg-white/10 disabled:opacity-70">
          Continue with Google
        </button>
        <div className="mt-4 text-center text-sm text-slate-400">
          <Link href="/" className="text-cyan-200">Return home</Link>
        </div>
      </div>
    </div>
  );
}
