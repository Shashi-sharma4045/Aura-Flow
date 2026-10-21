import React, { useState, useEffect, lazy, Suspense } from 'react';
import { supabase } from './supabaseClient';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [authenticatedEmail, setAuthenticatedEmail] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const [isGuest, setIsGuest] = useState(false);

  // Fixed: User is strictly authenticated only with a verified Supabase access_token or explicit dev guest mode
  const isLoggedIn = Boolean(session?.access_token) || (import.meta.env.DEV && isGuest);

  useEffect(() => {
    // Check if initial URL or hash contains recovery token
    const isRecoveryMode =
      window.location.hash.includes('type=recovery') ||
      window.location.search.includes('type=recovery');

    if (isRecoveryMode) {
      setIsPasswordRecovery(true);
    }

    // 1. Check initial session from Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.email) {
        setAuthenticatedEmail(session.user.email);
      }
      setIsLoadingAuth(false);
    });

    // 2. Subscribe to auth state updates (sign in, sign out, OAuth redirect, password recovery)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }
      setSession(session);
      if (session?.user?.email) {
        setAuthenticatedEmail(session.user.email);
      } else if (!session) {
        setAuthenticatedEmail(null);
      }
      setIsLoadingAuth(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Sign out warning:', e);
    }
    setSession(null);
    setAuthenticatedEmail(null);
    setIsGuest(false);
  };

  const handleLoginSuccess = (email: string) => {
    setAuthenticatedEmail(email);
  };

  if (isLoadingAuth) {
    return (
      <div style={{ minHeight: '100vh', background: '#090A0F', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite', color: '#F43F5E' }}>progress_activity</span>
          <span>Loading workspace...</span>
        </div>
      </div>
    );
  }

  const suspenseFallback = (
    <div style={{ minHeight: '100vh', background: '#090A0F', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite', color: '#F43F5E' }}>progress_activity</span>
        <span>Loading...</span>
      </div>
    </div>
  );

  return (
    <Suspense fallback={suspenseFallback}>
      {isPasswordRecovery ? (
        <Login
          initialMode="update_password"
          onPasswordResetComplete={() => {
            setIsPasswordRecovery(false);
            if (typeof window !== 'undefined' && window.history.replaceState) {
              window.history.replaceState(null, '', window.location.pathname);
            }
          }}
          onLoginSuccess={(email) => {
            setIsPasswordRecovery(false);
            setAuthenticatedEmail(email);
            if (typeof window !== 'undefined' && window.history.replaceState) {
              window.history.replaceState(null, '', window.location.pathname);
            }
          }}
        />
      ) : isLoggedIn ? (
        <Dashboard
          userEmail={session?.user?.email || (isGuest ? 'guest@focusflow.local' : 'user@focusflow.io')}
          onSignOut={handleSignOut}
        />
      ) : (
        <Login
          onLoginSuccess={handleLoginSuccess}
          onExploreGuest={() => {
            setIsGuest(true);
            setAuthenticatedEmail('guest@focusflow.local');
          }}
        />
      )}
    </Suspense>
  );
};

export default App;
