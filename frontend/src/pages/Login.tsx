// src/pages/Login.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { isValidEmail, isValidPassword, sanitizeAuthError } from '../utils/security';

interface LoginProps {
  onLoginSuccess?: (email: string) => void;
  onExploreGuest?: () => void;
  initialMode?: 'signin' | 'signup' | 'forgot' | 'update_password';
  onPasswordResetComplete?: () => void;
}

const GOOGLE_CLIENT_ID =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) ||
  '231491990306-iie30urntnqtjlmoinunre5cur2i69r5.apps.googleusercontent.com';

const Login: React.FC<LoginProps> = ({
  onLoginSuccess,
  onExploreGuest,
  initialMode = 'signin',
  onPasswordResetComplete,
}) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot' | 'update_password'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (initialMode) {
      setAuthMode(initialMode);
    }
  }, [initialMode]);

  // Initialize Google Identity Services
  useEffect(() => {
    const initGsi = () => {
      if ((window as any).google?.accounts?.id && GOOGLE_CLIENT_ID) {
        try {
          (window as any).google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            // Fixed: Cryptographically verify Google ID token with Supabase instead of trusting unverified atob() decoding
            callback: async (response: any) => {
              if (!response?.credential) return;
              try {
                setLoading(true);
                setError(null);
                const { data, error: idTokenErr } = await supabase.auth.signInWithIdToken({
                  provider: 'google',
                  token: response.credential,
                });
                if (idTokenErr) {
                  setError(sanitizeAuthError(idTokenErr));
                  setLoading(false);
                  return;
                }
                setSuccess(true);
                setInfoMessage('Google authentication verified successfully.');
                setTimeout(() => {
                  if (onLoginSuccess && data?.user?.email) onLoginSuccess(data.user.email);
                }, 600);
              } catch (e: any) {
                setError(sanitizeAuthError(e));
                setLoading(false);
              }
            },
          });
        } catch (e) {
          console.warn('GSI init notice:', e);
        }
      }
    };

    const t = setTimeout(initGsi, 600);
    return () => clearTimeout(t);
  }, [onLoginSuccess]);

  // App Auth: Email & Password
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    // Fixed: Input validation to prevent malformed or injection-prone payloads
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    const passwordCheck = isValidPassword(password);
    if (!passwordCheck.valid) {
      setError(passwordCheck.reason || 'Password does not meet security requirements.');
      return;
    }

    setLoading(true);
    setSuccess(false);

    if (authMode === 'signup') {
      try {
        const { error: signUpErr } = await supabase.auth.signUp({ email, password });
        setLoading(false);

        // Fixed: Eliminated client-side auth bypass on provider rate-limit or quota errors
        if (signUpErr) {
          setError(sanitizeAuthError(signUpErr));
          return;
        }

        setSuccess(true);
        setInfoMessage('Registration successful! Please check your email to verify your account.');
      } catch (err: any) {
        setLoading(false);
        setError(sanitizeAuthError(err));
      }
      return;
    }

    try {
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);

      // Fixed: Eliminated client-side auth bypass on unconfirmed email or rate-limit errors
      if (signInErr) {
        setError(sanitizeAuthError(signInErr));
        return;
      }

      setSuccess(true);
      setInfoMessage('Authentication successful. Initializing workspace...');
      setTimeout(() => {
        if (onLoginSuccess && signInData?.user?.email) onLoginSuccess(signInData.user.email);
      }, 600);
    } catch (err: any) {
      setLoading(false);
      setError(sanitizeAuthError(err));
    }
  };

  // Google & Apple OAuth Handlers
  const handleOAuth = async (provider: 'google' | 'apple') => {
    setError(null);
    setInfoMessage(null);
    setOauthLoading(provider);

    try {
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}${window.location.pathname}`,
        },
      });

      // Fixed: Eliminated fake credentials fallback on OAuth failure
      if (oauthErr) {
        setOauthLoading(null);
        setError(sanitizeAuthError(oauthErr));
      }
    } catch (err: any) {
      setOauthLoading(null);
      setError(sanitizeAuthError(err));
    }
  };

  // Fixed: Removed hardcoded plaintext credentials from client bundle
  const handleDemoLogin = () => {
    if (!import.meta.env.DEV) {
      setError('Demo accounts are disabled in production.');
      return;
    }
    if (onExploreGuest) {
      onExploreGuest();
    }
  };

  // Dispatch password recovery link to user's email
  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    if (!isValidEmail(email)) {
      setError('Please enter a valid registered email address.');
      return;
    }

    setLoading(true);
    try {
      // Dynamic redirect URL that automatically supports both GitHub Pages (/Aura-Flow/) and local dev
      const redirectUrl = `${window.location.origin}${window.location.pathname}`;
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      setLoading(false);
      if (resetErr) {
        setError(sanitizeAuthError(resetErr));
      } else {
        setSuccess(true);
        setInfoMessage(`Password reset link dispatched to ${email}. Please check your inbox and click the link to set a new password.`);
      }
    } catch (err: any) {
      setLoading(false);
      setError(sanitizeAuthError(err));
    }
  };

  // Submit and update new password during recovery
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const passwordCheck = isValidPassword(password);
    if (!passwordCheck.valid) {
      setError(passwordCheck.reason || 'Password must be at least 8 characters and contain letters and numbers.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify both fields.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: updateErr } = await supabase.auth.updateUser({
        password: password,
      });
      setLoading(false);
      if (updateErr) {
        setError(sanitizeAuthError(updateErr));
        return;
      }
      setSuccess(true);
      setInfoMessage('Password successfully updated! Initializing workspace...');
      setTimeout(() => {
        if (onPasswordResetComplete) {
          onPasswordResetComplete();
        }
        if (onLoginSuccess && data?.user?.email) {
          onLoginSuccess(data.user.email);
        }
      }, 1000);
    } catch (err: any) {
      setLoading(false);
      setError(sanitizeAuthError(err));
    }
  };

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        .login-root {
          min-height: 100vh;
          background: #090A0F;
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #E2E8F0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow-x: hidden;
          padding: 2rem 1rem;
        }

        .ambient-mesh {
          position: fixed;
          inset: 0;
          background:
            radial-gradient(circle at 50% 15%, rgba(244, 63, 94, 0.08) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(99, 102, 241, 0.06) 0%, transparent 45%);
          pointer-events: none;
          z-index: 0;
        }

        .login-card {
          width: 100%;
          max-width: 440px;
          background: #0D1017;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          box-shadow: 0 12px 40px -4px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05);
          padding: 2.25rem 2rem;
          position: relative;
          z-index: 10;
        }

        .brand-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, #F43F5E, #FB7185);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #FFF;
          box-shadow: 0 2px 14px rgba(244, 63, 94, 0.4);
          margin-bottom: 1.25rem;
        }

        .glass-input {
          width: 100%;
          padding: 0.625rem 0.875rem 0.625rem 2.5rem;
          background: #090A0F;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          color: #F8FAFC;
          font-size: 13px;
          font-family: inherit;
          transition: all 0.15s ease;
          outline: none;
        }
        .glass-input:focus {
          border-color: #F43F5E;
          box-shadow: 0 0 0 3px rgba(244, 63, 94, 0.15);
        }

        .input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .input-icon {
          position: absolute;
          left: 0.75rem;
          color: #64748B;
          font-size: 18px;
          pointer-events: none;
        }

        .btn-submit {
          width: 100%;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          background: linear-gradient(135deg, #F43F5E, #E11D48);
          color: #FFF;
          font-weight: 600;
          font-size: 13px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          box-shadow: 0 2px 14px rgba(244, 63, 94, 0.35);
          transition: all 0.15s ease;
        }
        .btn-submit:hover:not(:disabled) {
          box-shadow: 0 4px 20px rgba(244, 63, 94, 0.5);
          transform: translateY(-1px);
        }
        .btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }

        .btn-oauth {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #E2E8F0;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-oauth:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.15);
          color: #FFF;
        }
        .btn-oauth:disabled { opacity: 0.6; cursor: not-allowed; }

        .auth-toggle-bar {
          display: flex;
          padding: 3px;
          border-radius: 8px;
          background: #090A0F;
          border: 1px solid rgba(255, 255, 255, 0.06);
          margin-bottom: 1.5rem;
        }
        .auth-toggle-btn {
          flex: 1;
          padding: 0.375rem;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          color: #94A3B8;
          border: none;
          background: transparent;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .auth-toggle-btn.active {
          background: rgba(244, 63, 94, 0.15);
          color: #FB7185;
          font-weight: 600;
        }

        .divider {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 1.25rem 0;
          color: #64748B;
          font-size: 11px;
        }
        .divider::before, .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(255, 255, 255, 0.06);
        }
      `}</style>

      <div className="login-root">
        <div className="ambient-mesh" />

        <div className="login-card">
          {/* Logo & Header */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div className="brand-icon">
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                {authMode === 'forgot' ? 'lock_reset' : authMode === 'update_password' ? 'key' : 'timer'}
              </span>
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 0.25rem', color: '#F8FAFC', letterSpacing: '-0.02em' }}>
              {authMode === 'signin'
                ? 'Welcome Back to Aura Flow'
                : authMode === 'signup'
                ? 'Create Focus Workspace'
                : authMode === 'forgot'
                ? 'Reset Your Password'
                : 'Create New Password'}
            </h1>
            <p style={{ fontSize: 12, color: '#94A3B8', margin: '0 0 1.25rem' }}>
              {authMode === 'signin'
                ? 'Enter credentials to resume your deep focus session'
                : authMode === 'signup'
                ? 'Sign up to start tracking your daily flow intervals'
                : authMode === 'forgot'
                ? 'Enter your registered email and we will send you a password reset link'
                : 'Choose a strong new password for your Aura Flow account'}
            </p>
          </div>

          {/* Mode Switcher for Sign In / Sign Up */}
          {(authMode === 'signin' || authMode === 'signup') && (
            <>
              <div className="auth-toggle-bar">
                <button
                  type="button"
                  className={`auth-toggle-btn${authMode === 'signin' ? ' active' : ''}`}
                  onClick={() => { setAuthMode('signin'); setError(null); setInfoMessage(null); }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className={`auth-toggle-btn${authMode === 'signup' ? ' active' : ''}`}
                  onClick={() => { setAuthMode('signup'); setError(null); setInfoMessage(null); }}
                >
                  Create Account
                </button>
              </div>

              {/* OAuth Buttons */}
              <div style={{ display: 'flex', gap: '0.625rem', marginBottom: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => handleOAuth('google')}
                  disabled={loading || oauthLoading !== null}
                  className="btn-oauth"
                  title="Authenticate with Google"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z" fill="#4285F4"/>
                    <path d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" fill="#34A853"/>
                    <path d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z" fill="#FBBC05"/>
                    <path d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" fill="#EA4335"/>
                  </svg>
                  <span>{oauthLoading === 'google' ? 'Connecting...' : 'Google'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOAuth('apple')}
                  disabled={loading || oauthLoading !== null}
                  className="btn-oauth"
                  title="Authenticate with Apple"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.36c.62-.75 1.04-1.8.93-2.85-.9.04-2 .6-2.65 1.36-.57.65-1.07 1.72-.94 2.74 1.01.08 2.04-.5 2.66-1.25z"/>
                  </svg>
                  <span>{oauthLoading === 'apple' ? 'Connecting...' : 'Apple'}</span>
                </button>
              </div>

              <div className="divider">or continue with email</div>
            </>
          )}

          {/* ── FORGOT PASSWORD FORM ── */}
          {authMode === 'forgot' && (
            <form onSubmit={handleSendResetLink} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label htmlFor="reset-email" style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94A3B8', marginBottom: 4 }}>
                  REGISTERED ACCOUNT EMAIL
                </label>
                <div className="input-wrap">
                  <span className="material-symbols-outlined input-icon">mail</span>
                  <input
                    id="reset-email"
                    type="email"
                    required
                    placeholder="alex.creator@creativeflow.io"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="glass-input"
                  />
                </div>
              </div>

              {/* Status alerts */}
              {error && (
                <div style={{ padding: '0.625rem 0.875rem', borderRadius: 8, background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.25)', color: '#FB7185', fontSize: 12 }}>
                  {error}
                </div>
              )}
              {infoMessage && (
                <div style={{ padding: '0.625rem 0.875rem', borderRadius: 8, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', color: '#10B981', fontSize: 12 }}>
                  {infoMessage}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-submit">
                {loading ? (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, animation: 'spin 1s linear infinite' }}>progress_activity</span>
                    <span>Sending Reset Link...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>
                    <span>Send Password Reset Link</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setAuthMode('signin'); setError(null); setInfoMessage(null); }}
                style={{
                  background: 'none',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 8,
                  padding: '0.5rem',
                  color: '#94A3B8',
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  marginTop: '0.25rem',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
                <span>Back to Sign In</span>
              </button>
            </form>
          )}

          {/* ── UPDATE PASSWORD FORM (RECOVERY) ── */}
          {authMode === 'update_password' && (
            <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label htmlFor="new-password" style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94A3B8', marginBottom: 4 }}>
                  NEW PASSWORD
                </label>
                <div className="input-wrap">
                  <span className="material-symbols-outlined input-icon">lock</span>
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Min 8 characters (letters & numbers)"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="glass-input"
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '0.75rem', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', display: 'flex', padding: 0 }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirm-new-password" style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94A3B8', marginBottom: 4 }}>
                  CONFIRM NEW PASSWORD
                </label>
                <div className="input-wrap">
                  <span className="material-symbols-outlined input-icon">lock_clock</span>
                  <input
                    id="confirm-new-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="glass-input"
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{ position: 'absolute', right: '0.75rem', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', display: 'flex', padding: 0 }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      {showConfirmPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Security indicators */}
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: 11, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: password.length >= 8 ? '#10B981' : '#64748B' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                    {password.length >= 8 ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  <span>At least 8 characters long</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: (/[a-zA-Z]/.test(password) && /[0-9]/.test(password)) ? '#10B981' : '#64748B' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                    {(/[a-zA-Z]/.test(password) && /[0-9]/.test(password)) ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  <span>Contains both letters and numbers</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: (password.length > 0 && password === confirmPassword) ? '#10B981' : '#64748B' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                    {(password.length > 0 && password === confirmPassword) ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  <span>Passwords match</span>
                </div>
              </div>

              {/* Status alerts */}
              {error && (
                <div style={{ padding: '0.625rem 0.875rem', borderRadius: 8, background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.25)', color: '#FB7185', fontSize: 12 }}>
                  {error}
                </div>
              )}
              {infoMessage && (
                <div style={{ padding: '0.625rem 0.875rem', borderRadius: 8, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', color: '#10B981', fontSize: 12 }}>
                  {infoMessage}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-submit">
                {loading ? (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, animation: 'spin 1s linear infinite' }}>progress_activity</span>
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>lock</span>
                    <span>Save New Password</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ── STANDARD SIGN IN / SIGN UP FORM ── */}
          {(authMode === 'signin' || authMode === 'signup') && (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Email Field */}
              <div>
                <label htmlFor="login-email" style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94A3B8', marginBottom: 4 }}>
                  EMAIL ADDRESS
                </label>
                <div className="input-wrap">
                  <span className="material-symbols-outlined input-icon">mail</span>
                  <input
                    id="login-email"
                    type="email"
                    required
                    placeholder="alex.creator@creativeflow.io"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="glass-input"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label htmlFor="login-password" style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8' }}>PASSWORD</label>
                  {authMode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => { setAuthMode('forgot'); setError(null); setInfoMessage(null); }}
                      style={{ background: 'none', border: 'none', fontSize: 11, color: '#FB7185', cursor: 'pointer', padding: 0 }}
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="input-wrap">
                  <span className="material-symbols-outlined input-icon">lock</span>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="glass-input"
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '0.75rem', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', display: 'flex', padding: 0 }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#94A3B8' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    style={{ accentColor: '#F43F5E' }}
                  />
                  <span>Remember session</span>
                </label>
                <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: '#64748B' }}>AES-256</span>
              </div>

              {/* Status alerts */}
              {error && (
                <div style={{ padding: '0.625rem 0.875rem', borderRadius: 8, background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.25)', color: '#FB7185', fontSize: 12 }}>
                  {error}
                </div>
              )}
              {infoMessage && (
                <div style={{ padding: '0.625rem 0.875rem', borderRadius: 8, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', color: '#10B981', fontSize: 12 }}>
                  {infoMessage}
                </div>
              )}

              {/* Submit Button */}
              <button type="submit" disabled={loading} className="btn-submit">
                {loading ? (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, animation: 'spin 1s linear infinite' }}>progress_activity</span>
                    <span>Verifying Credentials...</span>
                  </>
                ) : success ? (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
                    <span>Authenticated</span>
                  </>
                ) : (
                  <>
                    <span>{authMode === 'signin' ? 'Sign In to Workspace' : 'Create Free Account'}</span>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                  </>
                )}
              </button>

              {/* Quick Demo Login */}
              <button
                type="button"
                onClick={handleDemoLogin}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#FB7185',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>bolt</span>
                <span>1-Click Demo Login (alex.focus@creativeflow.io)</span>
              </button>
            </form>
          )}

          {/* Footer toggle for Sign In / Sign Up */}
          {(authMode === 'signin' || authMode === 'signup') && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)', textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>
                {authMode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                    setError(null);
                    setInfoMessage(null);
                  }}
                  style={{ background: 'none', border: 'none', color: '#FB7185', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  {authMode === 'signin' ? 'Create one now ↗' : 'Sign in ↗'}
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Login;
