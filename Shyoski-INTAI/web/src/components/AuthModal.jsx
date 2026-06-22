import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AuthModal() {
  const {
    apiUrl,
    login,
    authModalOpen,
    setAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    showToast
  } = useAuth();

  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleTokenClient, setGoogleTokenClient] = useState(null);

  useEffect(() => {
    let isMounted = true;
    let intervalId;

    async function initGoogle() {
      try {
        const res = await fetch(`${apiUrl}/api/auth/google/client-id`);
        if (res.ok) {
          const data = await res.json();
          if (data.clientId) {
            intervalId = setInterval(() => {
              if (window.google && window.google.accounts) {
                clearInterval(intervalId);
                if (!isMounted) return;
                const client = window.google.accounts.oauth2.initTokenClient({
                  client_id: data.clientId,
                  scope: 'email profile openid',
                  callback: async (tokenResponse) => {
                    if (tokenResponse && tokenResponse.access_token) {
                      await handleGoogleLoginSuccess({ accessToken: tokenResponse.access_token });
                    }
                  }
                });
                setGoogleTokenClient(client);
                console.log('🛡️ Real Google OAuth initialized with Client ID');
              }
            }, 100);
          }
        }
      } catch (e) {
        console.warn('Could not initialize Real Google OAuth (falling back to Mock Mode):', e);
      }
    }

    initGoogle();

    // Message listener for Google Sign-in Popup Completion (Mock fallback flow)
    const handleMessage = async (event) => {
      if (event.data && event.data.type === 'google-login-success') {
        const emailVal = event.data.email;
        await handleGoogleLoginSuccess({ email: emailVal });
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener('message', handleMessage);
    };
  }, [apiUrl]);

  const handleGoogleLoginSuccess = async (payload) => {
    showToast('Verifying Google credentials...', 'var(--accent-blue)');
    try {
      const res = await fetch(`${apiUrl}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Google Authentication failed');
      }

      login(data.token, data.user.email);
      showToast('Google Sign-In Successful!', 'var(--success)');
      setAuthModalOpen(false);
      navigate('/dashboard');
    } catch (err) {
      alert("Google Authentication Error: " + err.message);
    }
  };

  const triggerGoogleLogin = () => {
    if (googleTokenClient) {
      googleTokenClient.requestAccessToken();
      return;
    }

    // Fallback: interactive mock popup
    const width = 500;
    const height = 580;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    const popup = window.open("", "GoogleSignIn", `width=${width},height=${height},left=${left},top=${top}`);
    if (!popup) {
      alert("Please allow popups to sign in with Google.");
      return;
    }

    popup.document.write(`
      <html>
        <head>
          <title>Sign in with Google</title>
          <style>
            body { font-family: -apple-system, sans-serif; background: #faf9f5; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; color: #1e293b; }
            .card { background: #ffffff; border: 1px solid rgba(184,144,71,0.15); border-radius: 16px; padding: 2.5rem; width: 100%; max-width: 350px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); text-align: center; }
            input { width: 100%; padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 8px; margin: 1.25rem 0; font-size: 0.95rem; box-sizing: border-box; }
            button { width: 100%; padding: 0.75rem; background: #4285f4; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
            button:hover { background: #357ae8; }
          </style>
        </head>
        <body>
          <div class="card">
            <svg width="40" height="40" viewBox="0 0 24 24" style="margin-bottom:1rem;"><path fill="#ea4335" d="M12 5.04c1.65 0 3.13.57 4.3 1.69l3.22-3.22C17.56 1.63 14.97 1 12 1 7.37 1 3.4 3.73 1.58 7.72l3.81 2.95C6.28 7.35 8.9 5.04 12 5.04z"/><path fill="#4285f4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.35H12v4.51h6.46c-.29 1.48-1.14 2.73-2.43 3.56l3.77 2.92c2.2-2.03 3.49-5.02 3.49-8.64z"/><path fill="#34a853" d="M12 23c2.97 0 5.46-1.09 7.28-2.95l-3.77-2.92c-1.04.7-2.38 1.12-3.51 1.12-3.1 0-5.72-2.31-6.61-5.63l-3.81 2.95C3.4 20.27 7.37 23 12 23z"/><path fill="#fbbc05" d="M5.39 12.62a7.1 7.1 0 0 1 0-4.24l-3.81-2.95A11.96 11.96 0 0 0 1 12c0 2.45.74 4.74 2.01 6.66l3.81-2.95a7.1 7.1 0 0 1-.43-3.09z"/></svg>
            <h2 style="font-size:1.25rem; margin-bottom: 0.25rem;">Sign in with Google</h2>
            <p style="color:#64748b; font-size:0.85rem; margin:0;">to continue to Shyoski App</p>
            <input type="email" id="google-email" value="googleuser@gmail.com" required>
            <button id="btn-google-auth">Continue</button>
          </div>
          <script>
            document.getElementById('btn-google-auth').onclick = function() {
              const email = document.getElementById('google-email').value;
              if (email) {
                window.opener.postMessage({ type: 'google-login-success', email: email }, '*');
                setTimeout(() => {
                  window.close();
                }, 100);
              }
            };
          </script>
        </body>
      </html>
    `);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    if (authModalMode === 'forgot') {
      try {
        const res = await fetch(`${apiUrl}/api/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: resetEmail })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to send recovery request');
        }

        alert('Success: ' + data.message + '\n(For testing: Check Render/server logs to retrieve the recovery link!)');
        setAuthModalMode('signin');
      } catch (err) {
        setErrorMsg(err.message);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const endpoint = authModalMode === 'signin' ? '/api/auth/login' : '/api/auth/register';
    try {
      const res = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      login(data.token, data.user.email);
      setAuthModalOpen(false);
      navigate('/dashboard');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!authModalOpen) return null;

  return (
    <div id="auth-modal" className={`modal-overlay active`}>
      <div className="modal-container">
        <button className="modal-close" onClick={() => setAuthModalOpen(false)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <h3 className="modal-title">
          {authModalMode === 'signin' && 'Sign In'}
          {authModalMode === 'signup' && 'Create Account'}
          {authModalMode === 'forgot' && 'Reset Password'}
        </h3>

        {authModalMode !== 'forgot' && (
          <div id="auth-google-block">
            <button type="button" className="btn-google" onClick={triggerGoogleLogin}>
              <svg width="18" height="18" viewBox="0 0 24 24" style={{ fill: '#4285F4' }}>
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.87-2.6-2.3-4.53-2.3-4.53z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
            <div className="auth-divider">or</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {authModalMode !== 'forgot' ? (
            <div id="auth-login-fields">
              <div className="form-group">
                <label className="form-label" htmlFor="auth-email">Email Address</label>
                <input
                  type="email"
                  id="auth-email"
                  className="form-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label" htmlFor="auth-password">Password</label>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setAuthModalMode('forgot');
                  }}
                  className="forgot-password-link"
                >
                  Forgot Password?
                </a>
                <input
                  type="password"
                  id="auth-password"
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          ) : (
            <div id="auth-forgot-fields">
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', textAlign: 'center' }}>
                Enter your email address and we'll send you a secure link to reset your password.
              </p>
              <div className="form-group">
                <label className="form-label" htmlFor="auth-reset-email">Email Address</label>
                <input
                  type="email"
                  id="auth-reset-email"
                  className="form-input"
                  placeholder="you@example.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {errorMsg && (
            <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1.25rem', textAlign: 'center' }}>
              {errorMsg}
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }} disabled={submitting}>
            {submitting ? 'Processing...' : (
              authModalMode === 'signin' ? 'Sign In' :
              authModalMode === 'signup' ? 'Sign Up' : 'Send Recovery Link'
            )}
          </button>
        </form>

        {authModalMode !== 'forgot' ? (
          <div className="form-toggle">
            <span>{authModalMode === 'signin' ? "Don't have an account? " : "Already have an account? "}</span>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setAuthModalMode(authModalMode === 'signin' ? 'signup' : 'signin');
              }}
              style={{ fontWeight: 600 }}
            >
              {authModalMode === 'signin' ? 'Sign Up' : 'Sign In'}
            </a>
          </div>
        ) : (
          <div className="form-toggle">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setAuthModalMode('signin');
              }}
              style={{ fontWeight: 600 }}
            >
              Back to Sign In
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
