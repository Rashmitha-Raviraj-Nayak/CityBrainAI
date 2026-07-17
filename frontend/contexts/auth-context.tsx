"use client";

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { observeAuth, type AppUser } from '@/services/auth-service';
import { isFirebaseConfigured } from '@/firebase/config';

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setUser({
        uid: 'local-demo-user',
        email: 'demo@citybrain.local',
        displayName: 'Local Demo User',
        photoURL: null,
        role: 'citizen',
        emailVerified: true,
      });
      setLoading(false);
      return;
    }

    const unsubscribe = observeAuth((nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = useMemo(() => ({ user, loading }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
