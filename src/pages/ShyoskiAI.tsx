import React, { createContext, useState, useEffect, useContext, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BrainCircuit,
  Smartphone,
  Globe,
  Lock,
  RefreshCw,
  User,
  ArrowLeft,
  Briefcase,
  Terminal,
  FileText
} from 'lucide-react'
import { MagneticButton } from '../components/ui/MagneticButton'
import { UniverseCanvas } from '../components/3d/UniverseCanvas'
import { Canvas } from '@react-three/fiber'
import { AIWorld } from '../components/3d/OrbitingWorlds'

// ============================================================
// 1. LISENSING & AUTH CONTEXT
// ============================================================
const TOKEN_KEY = 'shyoski_user_token'
const EMAIL_KEY = 'shyoski_user_email'

export const API_URL =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.protocol === 'file:')
    ? 'http://localhost:5005'
    : 'https://shysoki-api.onrender.com'

interface AuthContextType {
  token: string | null;
  email: string | null;
  login: (newToken: string, newEmail: string) => void;
  logout: () => void;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  authModalMode: 'signin' | 'signup' | 'forgot';
  setAuthModalMode: (mode: 'signin' | 'signup' | 'forgot') => void;
  license: any;
  syncLicense: (currentToken?: string | null) => Promise<void>;
  toast: { show: boolean; message: string; color: string };
  showToast: (message: string, color: string) => void;
  purchasePlan: (plan: string, setLoading: (loading: boolean) => void, onSuccess?: () => void) => Promise<void>;
  apiUrl: string;
}

const AIAuthContext = createContext<AuthContextType | null>(null)

export function AIAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [email, setEmail] = useState<string | null>(() => localStorage.getItem(EMAIL_KEY))
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | 'forgot'>('signin')
  const [license, setLicense] = useState<any>(null)
  const [toast, setToast] = useState({ show: false, message: '', color: '' })

  const showToast = (message: string, color: string) => {
    setToast({ show: true, message, color })
    setTimeout(() => {
      setToast((prev) => (prev.message === message ? { ...prev, show: false } : prev))
    }, 4500)
  }

  const login = (newToken: string, newEmail: string) => {
    localStorage.setItem(TOKEN_KEY, newToken)
    localStorage.setItem(EMAIL_KEY, newEmail)
    setToken(newToken)
    setEmail(newEmail)
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(EMAIL_KEY)
    setToken(null)
    setEmail(null)
    setLicense(null)
  }

  const syncLicense = async (currentToken = token) => {
    if (!currentToken) return
    try {
      const res = await fetch(`${API_URL}/api/license/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify({ deviceId: 'web_dashboard' })
      })

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          logout()
          return
        }
        throw new Error('Could not sync license status.')
      }

      const data = await res.json()
      setLicense(data)
    } catch (err: any) {
      showToast(err.message, '#ef4444')
    }
  }

  const purchasePlan = async (plan: string, setLoading: (loading: boolean) => void, onSuccess?: () => void) => {
    if (!token) {
      setAuthModalMode('signin')
      setAuthModalOpen(true)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/payments/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ plan })
      })

      const orderData = await res.json()

      if (!res.ok) {
        throw new Error(orderData.error || 'Failed to create payment order')
      }

      setLoading(false)

      if (orderData.simulated) {
        showToast(`Simulation checkout complete! Verifying...`, '#eab308')

        // Instantly verify mock orders
        const verifyRes = await fetch(`${API_URL}/api/payments/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            orderId: orderData.order_id,
            paymentId: 'pay_simulated_web'
          })
        })

        const verifyData = await verifyRes.json()
        if (verifyRes.ok && verifyData.success) {
          showToast(`Successfully upgraded to ${plan.toUpperCase()}! (Simulation Mode)`, '#10b981')
          await syncLicense(token)
          if (onSuccess) onSuccess()
        } else {
          throw new Error(verifyData.error || 'Verification failed')
        }
      } else {
        // Trigger real Razorpay web SDK payment popover
        const options = {
          key: orderData.key_id,
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'Shyoski',
          description: `Purchase ${plan.toUpperCase()} Subscription`,
          order_id: orderData.order_id,
          handler: async function (response: any) {
            showToast('Payment successful. Verifying session...', '#06b6d4')

            try {
              const verifyRes = await fetch(`${API_URL}/api/payments/verify`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                  orderId: orderData.order_id,
                  paymentId: response.razorpay_payment_id,
                  signature: response.razorpay_signature
                })
              })

              const verifyData = await verifyRes.json()
              if (verifyRes.ok && verifyData.success) {
                showToast('Payment verified! Pass activated.', '#10b981')
                await syncLicense(token)
                if (onSuccess) onSuccess()
              } else {
                showToast(`Verification failed: ${verifyData.error}`, '#ef4444')
              }
            } catch (err) {
              showToast('Verification failed due to connectivity issues.', '#ef4444')
            }
          },
          prefill: {
            email: email
          },
          theme: {
            color: '#3b82f6'
          }
        }

        const rzp = new (window as any).Razorpay(options)
        rzp.open()
      }
    } catch (err: any) {
      showToast(err.message, '#ef4444')
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      syncLicense(token)
    }
  }, [token])

  return (
    <AIAuthContext.Provider
      value={{
        token,
        email,
        login,
        logout,
        authModalOpen,
        setAuthModalOpen,
        authModalMode,
        setAuthModalMode,
        license,
        syncLicense,
        toast,
        showToast,
        purchasePlan,
        apiUrl: API_URL
      }}
    >
      {children}
    </AIAuthContext.Provider>
  )
}

export function useAIAuth() {
  const context = useContext(AIAuthContext)
  if (!context) throw new Error('useAIAuth must be used inside an AIAuthProvider')
  return context
}

// ============================================================
// 2. AUTH MODAL COMPONENT (GLASS STYLE)
// ============================================================
function AIAuthModal() {
  const {
    apiUrl,
    login,
    authModalOpen,
    setAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    showToast
  } = useAIAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [resetEmail, setResetEmail] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [googleTokenClient, setGoogleTokenClient] = useState<any>(null)

  useEffect(() => {
    let isMounted = true
    let intervalId: any

    async function initGoogle() {
      try {
        const res = await fetch(`${apiUrl}/api/auth/google/client-id`)
        if (res.ok) {
          const data = await res.json()
          if (data.clientId) {
            intervalId = setInterval(() => {
              const g = (window as any).google
              if (g && g.accounts) {
                clearInterval(intervalId)
                if (!isMounted) return
                const client = g.accounts.oauth2.initTokenClient({
                  client_id: data.clientId,
                  scope: 'email profile openid',
                  callback: async (tokenResponse: any) => {
                    if (tokenResponse && tokenResponse.access_token) {
                      await handleGoogleLoginSuccess({ accessToken: tokenResponse.access_token })
                    }
                  }
                })
                setGoogleTokenClient(client)
              }
            }, 100)
          }
        }
      } catch (e) {
        console.warn('Could not initialize Google OAuth SDK:', e)
      }
    }

    initGoogle()

    const handleMessage = async (event: MessageEvent) => {
      if (event.data && event.data.type === 'google-login-success') {
        const emailVal = event.data.email
        await handleGoogleLoginSuccess({ email: emailVal })
      }
    }
    window.addEventListener('message', handleMessage)

    return () => {
      isMounted = false
      if (intervalId) clearInterval(intervalId)
      window.removeEventListener('message', handleMessage)
    }
  }, [apiUrl])

  const handleGoogleLoginSuccess = async (payload: any) => {
    showToast('Verifying Google credentials...', '#3b82f6')
    try {
      const res = await fetch(`${apiUrl}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Google Authentication failed')
      }

      login(data.token, data.user.email)
      showToast('Google Sign-In Successful!', '#10b981')
      setAuthModalOpen(false)
    } catch (err: any) {
      alert('Google Authentication Error: ' + err.message)
    }
  }

  const triggerGoogleLogin = () => {
    if (googleTokenClient) {
      googleTokenClient.requestAccessToken()
      return
    }

    // Mock Google Popup Fallback
    const width = 500
    const height = 580
    const left = (window.screen.width - width) / 2
    const top = (window.screen.height - height) / 2

    const popup = window.open('', 'GoogleSignIn', `width=${width},height=${height},left=${left},top=${top}`)
    if (!popup) {
      alert('Please allow popups to sign in with Google.')
      return
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
    `)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSubmitting(true)

    if (authModalMode === 'forgot') {
      try {
        const res = await fetch(`${apiUrl}/api/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: resetEmail })
        })

        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Failed to send recovery request')
        }

        alert('Success: ' + data.message + '\n(Check Server Logs to retrieve the recovery reset link!)')
        setAuthModalMode('signin')
      } catch (err: any) {
        setErrorMsg(err.message)
      } finally {
        setSubmitting(false)
      }
      return
    }

    const endpoint = authModalMode === 'signin' ? '/api/auth/login' : '/api/auth/register'
    try {
      const res = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed')
      }

      login(data.token, data.user.email)
      setAuthModalOpen(false)
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!authModalOpen) return null

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-900/40 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-white/90 border border-gray-200/50 p-8 rounded-3xl shadow-glass backdrop-blur-lg relative mx-4 text-gray-900"
      >
        <button
          onClick={() => setAuthModalOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <span className="block text-gray-500 font-bold">✕</span>
        </button>

        <h3 className="text-2xl font-extrabold text-center text-gray-900 mb-6">
          {authModalMode === 'signin' && 'Sign In'}
          {authModalMode === 'signup' && 'Create Account'}
          {authModalMode === 'forgot' && 'Reset Password'}
        </h3>

        {authModalMode !== 'forgot' && (
          <div>
            <button
              onClick={triggerGoogleLogin}
              className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 hover:bg-gray-50 py-3 px-4 rounded-xl text-sm font-semibold transition-all shadow-sm"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" style={{ fill: '#4285F4' }}>
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.87-2.6-2.3-4.53-2.3-4.53z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>
            <div className="flex items-center gap-3 my-5 text-xs text-gray-400 uppercase tracking-widest justify-center">
              <span className="w-10 h-px bg-gray-200" />
              <span>or</span>
              <span className="w-10 h-px bg-gray-200" />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {authModalMode !== 'forgot' ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Email Address</label>
                <input
                  type="email"
                  className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl p-3 text-sm outline-none transition-all"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="relative">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-gray-500">Password</label>
                  <button
                    type="button"
                    onClick={() => setAuthModalMode('forgot')}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-500 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
                <input
                  type="password"
                  className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl p-3 text-sm outline-none transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </>
          ) : (
            <div>
              <p className="text-xs text-gray-500 text-center mb-4">
                Enter your email address and we'll send you a secure link to reset your password.
              </p>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Email Address</label>
              <input
                type="email"
                className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl p-3 text-sm outline-none transition-all"
                placeholder="you@example.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
              />
            </div>
          )}

          {errorMsg && <div className="text-red-500 text-xs font-medium text-center">{errorMsg}</div>}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl text-sm shadow-md hover:bg-blue-500 transition-all flex items-center justify-center"
            disabled={submitting}
          >
            {submitting ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : authModalMode === 'signin' ? (
              'Sign In'
            ) : authModalMode === 'signup' ? (
              'Sign Up'
            ) : (
              'Send Recovery Link'
            )}
          </button>
        </form>

        {authModalMode !== 'forgot' ? (
          <div className="text-center text-xs text-gray-500 mt-5">
            <span>{authModalMode === 'signin' ? "Don't have an account? " : 'Already have an account? '}</span>
            <button
              onClick={() => setAuthModalMode(authModalMode === 'signin' ? 'signup' : 'signin')}
              className="font-bold text-blue-600 hover:underline"
            >
              {authModalMode === 'signin' ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
        ) : (
          <div className="text-center text-xs text-gray-500 mt-5">
            <button onClick={() => setAuthModalMode('signin')} className="font-bold text-blue-600 hover:underline">
              Back to Sign In
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ============================================================
// 3. MAIN COMPONENT EXPORT
// ============================================================
function ShyoskiAIContent() {
  const { token, email, logout, setAuthModalOpen, setAuthModalMode, license, syncLicense, purchasePlan, toast } = useAIAuth()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [view, setView] = useState<'landing' | 'dashboard' | 'careers' | 'changelog' | 'privacy' | 'security' | 'terms'>('landing')

  // Careers form state
  const [applyingJob, setApplyingJob] = useState<string | null>(null)
  const [applicantName, setApplicantName] = useState('')
  const [applicantEmail, setApplicantEmail] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [resumeUrl, setResumeUrl] = useState('')
  const [coverLetter, setCoverLetter] = useState('')
  const [submittingApp, setSubmittingApp] = useState(false)
  const [appError, setAppError] = useState('')

  const scrollProgressRef = useRef(0)
  const mousePosRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    // Dynamic Razorpay & Google Identity SDK Loader
    const rzpScript = document.createElement('script')
    rzpScript.src = 'https://checkout.razorpay.com/v1/checkout.js'
    rzpScript.async = true
    document.body.appendChild(rzpScript)

    const gScript = document.createElement('script')
    gScript.src = 'https://accounts.google.com/gsi/client'
    gScript.async = true
    gScript.defer = true
    document.body.appendChild(gScript)

    return () => {
      document.body.removeChild(rzpScript)
      document.body.removeChild(gScript)
    }
  }, [])

  const handlePurchase = (plan: string) => {
    purchasePlan(plan, (loading) => {
      setLoadingPlan(loading ? plan : null)
    })
  }

  const handleApplyClick = (jobTitle: string) => {
    setApplyingJob(jobTitle)
    setAppError('')
    setApplicantName('')
    setApplicantEmail('')
    setGithubUrl('')
    setResumeUrl('')
    setCoverLetter('')
  }

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAppError('')
    setSubmittingApp(true)

    try {
      const res = await fetch(`${API_URL}/api/careers/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: applyingJob,
          name: applicantName,
          email: applicantEmail,
          githubUrl,
          resumeUrl,
          coverLetter
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit application.')
      }

      setApplyingJob(null)
      alert('Application submitted successfully!')
    } catch (err: any) {
      setAppError(err.message)
    } finally {
      setSubmittingApp(false)
    }
  }

  const switchView = (newView: typeof view) => {
    setView(newView)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div id="shyoskiai-root" tabIndex={-1} className="relative min-h-screen w-full bg-gradient-to-b from-emerald-50 to-white flex flex-col items-center justify-center p-4 md:p-8 font-sans overflow-auto">
      {/* 3D background canvas (subtle, pointer-events-none) */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <UniverseCanvas scrollProgressRef={scrollProgressRef} mousePosRef={mousePosRef} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-7xl w-full bg-glass/80 border border-white/20 rounded-3xl shadow-glass backdrop-blur-md overflow-hidden flex flex-col mx-auto"
        >
          {/* ============================================================
              GLOBAL BRAND HEADER (WITH LOGO ON EVERY VIEW)
              ============================================================ */}
          <header className="w-full bg-white/40 border-b border-gray-200/30 px-6 py-4 flex flex-wrap justify-between items-center gap-4">
            <div
              onClick={() => {
                window.history.pushState(null, '', '/')
                window.dispatchEvent(new PopStateEvent('popstate'))
              }}
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <img src="/logo.png" alt="Shyoski Logo" className="h-8 w-auto" />
              <span className="text-lg font-bold tracking-tight text-gray-900 font-sans">
                SHYOSKI INTAI
              </span>
            </div>
            
            <nav className="flex flex-wrap items-center gap-4 text-xs font-semibold text-gray-600">
              <button onClick={() => switchView('landing')} className={`hover:text-emerald-700 transition-colors ${view === 'landing' ? 'text-emerald-600 font-bold' : ''}`}>Home</button>
              <button onClick={() => switchView('careers')} className={`hover:text-emerald-700 transition-colors ${view === 'careers' ? 'text-emerald-600 font-bold' : ''}`}>Careers</button>
              <button onClick={() => switchView('changelog')} className={`hover:text-emerald-700 transition-colors ${view === 'changelog' ? 'text-emerald-600 font-bold' : ''}`}>Changelog</button>
              <button onClick={() => switchView('security')} className={`hover:text-emerald-700 transition-colors ${view === 'security' ? 'text-emerald-600 font-bold' : ''}`}>Security Shield</button>
              <button onClick={() => switchView('terms')} className={`hover:text-emerald-700 transition-colors ${view === 'terms' ? 'text-emerald-600 font-bold' : ''}`}>Terms</button>
              <button onClick={() => switchView('privacy')} className={`hover:text-emerald-700 transition-colors ${view === 'privacy' ? 'text-emerald-600 font-bold' : ''}`}>Privacy</button>
              {token && (
                <button onClick={() => switchView('dashboard')} className={`hover:text-emerald-700 transition-colors ${view === 'dashboard' ? 'text-emerald-600 font-bold' : ''}`}>Dashboard</button>
              )}
            </nav>
          </header>

          <div className="p-6 md:p-10">
            {/* LANDING VIEW */}
            {view === 'landing' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start justify-center">
                <div className="col-span-1 md:col-span-2 w-full flex flex-col justify-center text-left">
                  <div className="inline-flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-emerald-50/80 border border-emerald-100 mb-4 mr-auto">
                    <BrainCircuit className="w-5 h-5 text-emerald-500" />
                    <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Career Intelligence</span>
                  </div>

                  <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 leading-tight mb-4">
                    The Professional AI Companion.
                    <span className="block text-emerald-600 mt-1 text-2xl md:text-3xl font-semibold font-sans">
                      Unrecordable. Untraceable.
                    </span>
                  </h1>

                  <p className="text-gray-600 leading-relaxed text-sm md:text-base mb-6 font-normal">
                    Deliver elite performance with silent real-time audio transcription, translation, and instant AI resolution.
                    Shyoski uses native hardware protection layers to hide completely from screen recorders, capture software, and streaming tools.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white/40 p-4 rounded-2xl border border-white/40 shadow-sm">
                      <Smartphone className="w-6 h-6 text-emerald-500 mb-2" />
                      <div className="font-bold text-gray-800 text-xs uppercase mb-1">Stealth Shield</div>
                      <div className="text-xs text-gray-500">Enforces secure, native display isolation layers. Stays completely invisible on Mercer Mettl, Proctorio, Zoom, Teams, and Discord screenshots.</div>
                    </div>
                    <div className="bg-white/40 p-4 rounded-2xl border border-white/40 shadow-sm">
                      <Globe className="w-6 h-6 text-cyan-500 mb-2" />
                      <div className="font-bold text-gray-800 text-xs uppercase mb-1">Active Tracker</div>
                      <div className="text-xs text-gray-500">Only pay for active minutes spent transcribing. The app detects speech silence to optimize and preserve your billing balance automatically.</div>
                    </div>
                    <div className="bg-white/40 p-4 rounded-2xl border border-white/40 shadow-sm">
                      <Lock className="w-6 h-6 text-indigo-500 mb-2" />
                      <div className="font-bold text-gray-800 text-xs uppercase mb-1">Device Lock</div>
                      <div className="text-xs text-gray-500">Secure hardware binding. Licenses are encrypted locally using native OS storage layers to enforce strict single-user device authorization.</div>
                    </div>
                  </div>

                  {/* Action Group */}
                  <div className="flex flex-wrap items-center gap-3 justify-start pt-2">
                    {token ? (
                      <button
                        onClick={() => switchView('dashboard')}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-full font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <User className="w-4 h-4" /> Go to Dashboard
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setAuthModalMode('signin')
                          setAuthModalOpen(true)
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-full font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <User className="w-4 h-4" /> Sign In / Sign Up
                      </button>
                    )}

                    <a
                      href="https://github.com/Manjunath2133/shysoki/releases/latest/download/Shyoski-1.0.0-arm64.dmg"
                      download
                    >
                      <MagneticButton className="bg-white/80 hover:bg-white border border-gray-200 text-gray-900 px-5 py-3 rounded-full font-semibold text-sm shadow-sm transition-all duration-300">
                        Download for macOS
                      </MagneticButton>
                    </a>
                    <a
                      href="https://github.com/Manjunath2133/shysoki/releases/latest/download/Shyoski.Setup.1.0.0.exe"
                      download
                    >
                      <MagneticButton className="bg-white/80 hover:bg-white border border-gray-200 text-gray-900 px-5 py-3 rounded-full font-semibold text-sm shadow-sm transition-all duration-300">
                        Download for Windows
                      </MagneticButton>
                    </a>

                    <button
                      onClick={() => {
                        window.history.pushState(null, '', '/')
                        window.dispatchEvent(new PopStateEvent('popstate'))
                      }}
                      className="text-sm text-gray-700 px-4 py-3 rounded-full bg-white/50 border border-white/30 hover:bg-white/80 cursor-pointer"
                    >
                      Return to Core
                    </button>
                  </div>

                  {/* Pricing Section (Unchanged content from Home.jsx) */}
                  <div id="pricing" className="mt-12 text-left">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Choose Your Access Pass</h3>
                    <p className="text-xs text-gray-500 mb-6">Secure, high-converting checkout via Razorpay. Upgrade or top-up anytime.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white/60 p-5 rounded-2xl border border-white/50 shadow-sm flex flex-col justify-between">
                        <div>
                          <h4 className="font-bold text-gray-800 text-sm">Hourly Pass</h4>
                          <p className="text-[10px] text-gray-400 mt-1">Pay-as-you-go audio resolution time.</p>
                          <div className="text-2xl font-extrabold text-emerald-600 my-2">
                            ₹30<span className="text-[10px] text-gray-400 font-medium font-mono"> / 60 mins</span>
                          </div>
                          <ul className="text-xs text-gray-600 space-y-2 mb-4">
                            <li className="flex items-center gap-1.5">✓ 60 Transcription Minutes</li>
                            <li className="flex items-center gap-1.5">✓ Unlimited AI Queries</li>
                            <li className="flex items-center gap-1.5">✓ Stealth Shield Enabled</li>
                          </ul>
                        </div>
                        <button onClick={() => handlePurchase('hourly')} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-xl text-xs transition-all cursor-pointer">
                          Get Pass
                        </button>
                      </div>

                      <div className="bg-white/60 p-5 rounded-2xl border border-white/50 shadow-sm flex flex-col justify-between">
                        <div>
                          <h4 className="font-bold text-gray-800 text-sm">1 Day Pass</h4>
                          <p className="text-[10px] text-gray-400 mt-1">Perfect for temporary high-usage days.</p>
                          <div className="text-2xl font-extrabold text-emerald-600 my-2">
                            ₹100<span className="text-[10px] text-gray-400 font-medium font-mono"> / 24 hours</span>
                          </div>
                          <ul className="text-xs text-gray-600 space-y-2 mb-4">
                            <li className="flex items-center gap-1.5">✓ 24 Hours Unlimited Time</li>
                            <li className="flex items-center gap-1.5">✓ Unlimited AI Queries</li>
                            <li className="flex items-center gap-1.5">✓ Single Device Lock</li>
                          </ul>
                        </div>
                        <button onClick={() => handlePurchase('daily')} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-xl text-xs transition-all cursor-pointer">
                          Get Pass
                        </button>
                      </div>

                      <div className="bg-white/80 p-5 rounded-2xl border border-emerald-300 shadow-md flex flex-col justify-between relative overflow-hidden">
                        <span className="absolute top-2 right-2 bg-emerald-100 text-emerald-700 font-extrabold text-[8px] px-2 py-0.5 rounded-full uppercase tracking-wider">Most Popular</span>
                        <div>
                          <h4 className="font-bold text-gray-800 text-sm">1 Month Pass</h4>
                          <p className="text-[10px] text-gray-400 mt-1">Our most popular duration choice.</p>
                          <div className="text-2xl font-extrabold text-emerald-600 my-2">
                            ₹3,000<span className="text-[10px] text-gray-400 font-medium font-mono"> / month</span>
                          </div>
                          <ul className="text-xs text-gray-600 space-y-2 mb-4">
                            <li className="flex items-center gap-1.5">✓ 30 Days Unlimited Time</li>
                            <li className="flex items-center gap-1.5">✓ Priority Resolution Speed</li>
                            <li className="flex items-center gap-1.5">✓ Premium Support Ticket</li>
                          </ul>
                        </div>
                        <button onClick={() => handlePurchase('monthly')} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-xl text-xs transition-all cursor-pointer">
                          Get Pass
                        </button>
                      </div>

                      <div className="bg-white/60 p-5 rounded-2xl border border-white/50 shadow-sm flex flex-col justify-between">
                        <div>
                          <h4 className="font-bold text-gray-800 text-sm">3 Months Pass</h4>
                          <p className="text-[10px] text-gray-400 mt-1">Extended productivity support.</p>
                          <div className="text-2xl font-extrabold text-emerald-600 my-2">
                            ₹6,000<span className="text-[10px] text-gray-400 font-medium font-mono"> / 3 mos</span>
                          </div>
                          <ul className="text-xs text-gray-600 space-y-2 mb-4">
                            <li className="flex items-center gap-1.5">✓ 90 Days Unlimited Time</li>
                            <li className="flex items-center gap-1.5">✓ Priority Resolution Speed</li>
                            <li className="flex items-center gap-1.5">✓ Device Binding Transfers</li>
                          </ul>
                        </div>
                        <button onClick={() => handlePurchase('3_months')} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-xl text-xs transition-all cursor-pointer">
                          Get Pass
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column Canvas */}
                <aside className="hidden md:flex flex-col items-center justify-between h-full py-2">
                  <div className="w-full bg-white/30 border border-white/30 rounded-3xl p-4 shadow-glass-sm aspect-square flex items-center justify-center">
                    <Canvas gl={{ antialias: true, alpha: true }} dpr={[1, 1.5]} camera={{ position: [0, 0, 4.5], fov: 40 }}>
                      <ambientLight intensity={0.6} />
                      <directionalLight position={[5, 5, 5]} intensity={0.8} />
                      <AIWorld position={[0, 0, 0]} />
                    </Canvas>
                  </div>

                  <div className="mt-8 w-full bg-white/40 border border-white/40 rounded-2xl p-5 shadow-sm text-left flex flex-col gap-2.5 text-xs font-semibold text-gray-600">
                    <div className="text-[10px] uppercase tracking-wider text-emerald-800 font-extrabold mb-1">Company Documents</div>
                    <button onClick={() => switchView('security')} className="hover:text-emerald-700 flex items-center gap-2 cursor-pointer">
                      <Terminal className="w-3.5 h-3.5" /> Security Shield Whitepaper
                    </button>
                    <button onClick={() => switchView('careers')} className="hover:text-emerald-700 flex items-center gap-2 cursor-pointer">
                      <Briefcase className="w-3.5 h-3.5" /> Careers & Job Openings
                    </button>
                    <button onClick={() => switchView('changelog')} className="hover:text-emerald-700 flex items-center gap-2 cursor-pointer">
                      <RefreshCw className="w-3.5 h-3.5" /> Product Changelog
                    </button>
                    <button onClick={() => switchView('terms')} className="hover:text-emerald-700 flex items-center gap-2 cursor-pointer">
                      <FileText className="w-3.5 h-3.5" /> End User Terms of Service
                    </button>
                    <button onClick={() => switchView('privacy')} className="hover:text-emerald-700 flex items-center gap-2 cursor-pointer">
                      <Lock className="w-3.5 h-3.5" /> Privacy Shield Promise
                    </button>
                  </div>
                </aside>
              </div>
            )}

            {/* DASHBOARD VIEW (Unchanged content and logic) */}
            {view === 'dashboard' && (
              <div className="w-full text-left">
                <div className="flex items-center justify-between border-b border-gray-200/30 pb-4 mb-6">
                  <div>
                    <h2 className="text-xl font-extrabold text-gray-900">Your Subscription Dashboard</h2>
                    <p className="text-xs text-gray-500 font-mono mt-1">Authorized Device Session: web_dashboard ({email})</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => switchView('landing')}
                      className="text-xs font-semibold px-4 py-2 bg-white border border-gray-200 rounded-full hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Landing Home
                    </button>
                    <button
                      onClick={() => {
                        logout()
                        switchView('landing')
                      }}
                      className="text-xs font-semibold px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-full hover:bg-red-100 flex items-center gap-2 cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>

                {license ? (
                  <div className="bg-white/60 border border-white/60 p-6 rounded-3xl shadow-sm mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative overflow-hidden">
                    <div className="col-span-1 sm:col-span-2 lg:col-span-4 flex justify-between items-center mb-2">
                      <div className="text-xs font-extrabold text-emerald-800 tracking-wider uppercase">Active License Pass</div>
                      <div className={`text-[10px] font-extrabold px-3 py-1 rounded-full text-white uppercase tracking-wider ${license.status === 'active' ? 'bg-emerald-600' : 'bg-yellow-600'}`}>
                        {license.status ? license.status.toUpperCase().replace('_', ' ') : 'FREE TRIAL'}
                      </div>
                    </div>

                    <div className="bg-white/40 p-4 rounded-2xl border border-white/50">
                      <div className="text-xs text-gray-400 mb-1">Pass Type</div>
                      <div className="text-base font-extrabold text-gray-900">{license.type ? license.type.toUpperCase() : '-'}</div>
                    </div>
                    <div className="bg-white/40 p-4 rounded-2xl border border-white/50">
                      <div className="text-xs text-gray-400 mb-1">Paid Minutes Left</div>
                      <div className="text-base font-extrabold text-gray-900">{Math.ceil(license.paid_minutes_left ?? 0)} mins</div>
                    </div>
                    <div className="bg-white/40 p-4 rounded-2xl border border-white/50">
                      <div className="text-xs text-gray-400 mb-1">Trial Queries Left</div>
                      <div className="text-base font-extrabold text-gray-900">{license.free_queries_left ?? 0}</div>
                    </div>
                    <div className="bg-white/40 p-4 rounded-2xl border border-white/50">
                      <div className="text-xs text-gray-400 mb-1">Expiration Date</div>
                      <div className="text-xs font-bold text-gray-900 leading-relaxed truncate">
                        {license.expires_at ? new Date(license.expires_at).toLocaleString() : license.type === 'hourly' ? 'No Expiry (Minutes Pool)' : 'Never'}
                      </div>
                    </div>

                    <div className="col-span-1 sm:col-span-2 lg:col-span-4 pt-4 flex justify-end">
                      <button
                        onClick={() => syncLicense(token)}
                        className="text-xs font-semibold px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm flex items-center gap-2 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Sync License Status
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/60 border border-white/60 p-8 rounded-3xl text-center shadow-sm mb-8 flex flex-col items-center gap-3">
                    <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
                    <div className="font-semibold text-gray-700">Syncing licensing credentials...</div>
                  </div>
                )}

                <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">Need More Credits? Buy an Access Pass</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white/50 p-5 rounded-2xl border border-white/40 shadow-sm flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm">Hourly Pass</h4>
                      <div className="text-xl font-extrabold text-emerald-600 my-1">₹30<span> / 60 mins</span></div>
                    </div>
                    <button onClick={() => handlePurchase('hourly')} disabled={loadingPlan === 'hourly'} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-xl text-xs cursor-pointer mt-4">
                      {loadingPlan === 'hourly' ? 'Connecting...' : 'Purchase Pass'}
                    </button>
                  </div>
                  <div className="bg-white/50 p-5 rounded-2xl border border-white/40 shadow-sm flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm">1 Day Pass</h4>
                      <div className="text-xl font-extrabold text-emerald-600 my-1">₹100<span> / 24 hours</span></div>
                    </div>
                    <button onClick={() => handlePurchase('daily')} disabled={loadingPlan === 'daily'} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-xl text-xs cursor-pointer mt-4">
                      {loadingPlan === 'daily' ? 'Connecting...' : 'Purchase Pass'}
                    </button>
                  </div>
                  <div className="bg-white/50 p-5 rounded-2xl border border-white/40 shadow-sm flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm">1 Month Pass</h4>
                      <div className="text-xl font-extrabold text-emerald-600 my-1">₹3,000<span> / month</span></div>
                    </div>
                    <button onClick={() => handlePurchase('monthly')} disabled={loadingPlan === 'monthly'} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-xl text-xs cursor-pointer mt-4">
                      {loadingPlan === 'monthly' ? 'Connecting...' : 'Purchase Pass'}
                    </button>
                  </div>
                  <div className="bg-white/50 p-5 rounded-2xl border border-white/40 shadow-sm flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm">1 Year Pass</h4>
                      <div className="text-xl font-extrabold text-emerald-600 my-1">₹12,000<span> / year</span></div>
                    </div>
                    <button onClick={() => handlePurchase('yearly')} disabled={loadingPlan === 'yearly'} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-xl text-xs cursor-pointer mt-4">
                      {loadingPlan === 'yearly' ? 'Connecting...' : 'Purchase Pass'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* CAREERS VIEW (Entire, untrimmed content of Careers.jsx) */}
            {view === 'careers' && (
              <div className="w-full text-left max-w-4xl mx-auto">
                <div className="flex items-center justify-between border-b border-gray-200/30 pb-4 mb-6">
                  <h2 className="text-2xl font-extrabold text-gray-900">Shape the Future of Stealth AI</h2>
                  <button
                    onClick={() => switchView('landing')}
                    className="text-xs font-semibold px-4 py-2 bg-white border border-gray-200 rounded-full hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Return
                  </button>
                </div>

                <p className="text-sm text-gray-600 leading-relaxed mb-8">
                  We are building the next generation of unrecordable, context-aware translation and productivity utilities.
                  Help us push the boundaries of display architectures and machine learning.
                </p>

                {/* Values Card Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  <div className="bg-white/50 border border-white/40 p-5 rounded-2xl shadow-sm">
                    <h3 className="font-extrabold text-sm text-gray-800 mb-2">Absolute Privacy</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      We believe data ownership is a human right. We build security-first systems that run local filters and
                      process audio loops transparently.
                    </p>
                  </div>
                  <div className="bg-white/50 border border-white/40 p-5 rounded-2xl shadow-sm">
                    <h3 className="font-extrabold text-sm text-gray-800 mb-2">High Autonomy</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      We trust our builders. We don't track hours or manage tasks rigidly; we evaluate execution, clean code,
                      and speed of delivery.
                    </p>
                  </div>
                  <div className="bg-white/50 border border-white/40 p-5 rounded-2xl shadow-sm">
                    <h3 className="font-extrabold text-sm text-gray-800 mb-2">Extreme Craftsmanship</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Every pixel and hotkey response matters. We are obsessed with sub-millisecond audio rendering and
                      completely silent overlays.
                    </p>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">Open Positions</h3>
                
                {/* Job openings */}
                <div className="space-y-4 mb-8">
                  <div className="bg-white/50 border border-white/50 p-5 rounded-2xl flex justify-between items-center flex-wrap gap-4">
                    <div>
                      <h4 className="font-bold text-sm text-gray-800">Senior Electron & Display Systems Engineer</h4>
                      <div className="flex gap-2 text-[10px] text-gray-400 font-semibold mt-1">
                        <span>Engineering</span> • <span>Full-Time</span> • <span>Remote</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleApplyClick('Senior Electron & Display Systems Engineer')}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
                    >
                      Apply Now
                    </button>
                  </div>

                  <div className="bg-white/50 border border-white/50 p-5 rounded-2xl flex justify-between items-center flex-wrap gap-4">
                    <div>
                      <h4 className="font-bold text-sm text-gray-800">AI Systems Research Scientist (Audio & NLP)</h4>
                      <div className="flex gap-2 text-[10px] text-gray-400 font-semibold mt-1">
                        <span>R&D</span> • <span>Full-Time</span> • <span>Hybrid (Bengaluru)</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleApplyClick('AI Systems Research Scientist (Audio & NLP)')}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
                    >
                      Apply Now
                    </button>
                  </div>

                  <div className="bg-white/50 border border-white/50 p-5 rounded-2xl flex justify-between items-center flex-wrap gap-4">
                    <div>
                      <h4 className="font-bold text-sm text-gray-800">Developer Relations & Technical Advocate</h4>
                      <div className="flex gap-2 text-[10px] text-gray-400 font-semibold mt-1">
                        <span>Marketing</span> • <span>Contract</span> • <span>Remote</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleApplyClick('Developer Relations & Technical Advocate')}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
                    >
                      Apply Now
                    </button>
                  </div>
                </div>

                {/* Application Popup modal */}
                {applyingJob && (
                  <div className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-900/40 backdrop-blur-md">
                    <div className="bg-white p-6 rounded-3xl max-w-md w-full relative shadow-glass mx-4 text-gray-800 max-h-[90vh] overflow-y-auto text-left">
                      <button onClick={() => setApplyingJob(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold">✕</button>
                      <h3 className="text-lg font-bold mb-1">Apply for Position</h3>
                      <div className="text-xs text-emerald-700 font-semibold mb-4">{applyingJob}</div>

                      <form onSubmit={handleApplySubmit} className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Full Name</label>
                          <input
                            type="text"
                            className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-emerald-500 rounded-xl p-3 text-xs outline-none text-gray-900"
                            placeholder="John Doe"
                            value={applicantName}
                            onChange={(e) => setApplicantName(e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Email Address</label>
                          <input
                            type="email"
                            className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-emerald-500 rounded-xl p-3 text-xs outline-none text-gray-900"
                            placeholder="johndoe@example.com"
                            value={applicantEmail}
                            onChange={(e) => setApplicantEmail(e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">GitHub Profile URL (Optional)</label>
                          <input
                            type="url"
                            className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-emerald-500 rounded-xl p-3 text-xs outline-none text-gray-900"
                            placeholder="https://github.com/johndoe"
                            value={githubUrl}
                            onChange={(e) => setGithubUrl(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Resume Link (PDF Link, Google Drive, etc.)</label>
                          <input
                            type="url"
                            className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-emerald-500 rounded-xl p-3 text-xs outline-none text-gray-900"
                            placeholder="https://drive.google.com/.../resume.pdf"
                            value={resumeUrl}
                            onChange={(e) => setResumeUrl(e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Cover Letter / Pitch (Optional)</label>
                          <textarea
                            rows={3}
                            className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-emerald-500 rounded-xl p-3 text-xs outline-none resize-y text-gray-900"
                            placeholder="Tell us why you are a great fit for Shyoski..."
                            value={coverLetter}
                            onChange={(e) => setCoverLetter(e.target.value)}
                          />
                        </div>
                        {appError && <div className="text-red-500 text-xs text-center">{appError}</div>}
                        <button type="submit" disabled={submittingApp} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center cursor-pointer">
                          {submittingApp ? 'Submitting Application...' : 'Submit Application'}
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CHANGELOG VIEW (Entire, untrimmed content of Changelog.jsx) */}
            {view === 'changelog' && (
              <div className="w-full text-left max-w-3xl mx-auto">
                <div className="flex items-center justify-between border-b border-gray-200/30 pb-4 mb-6">
                  <h2 className="text-2xl font-extrabold text-gray-900">Product Changelog</h2>
                  <button
                    onClick={() => switchView('landing')}
                    className="text-xs font-semibold px-4 py-2 bg-white border border-gray-200 rounded-full hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Return
                  </button>
                </div>

                <p className="text-sm text-gray-500 leading-relaxed mb-8">
                  Stay updated with the latest improvements, optimizations, and security updates compiled into the Shyoski platform.
                </p>

                <div className="space-y-8 pl-6 border-l-2 border-emerald-500/20 relative">
                  {/* Item v1.0.1 */}
                  <div className="relative mb-6">
                    <div className="absolute top-1.5 -left-[31px] w-4 h-4 rounded-full bg-emerald-500 border-4 border-white shadow-sm" />
                    <div className="flex flex-wrap gap-2.5 items-center mb-2">
                      <span className="text-base font-extrabold text-gray-900">v1.0.1</span>
                      <span className="text-xs text-gray-400 font-semibold font-mono">June 2026</span>
                      <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 tracking-wider">Security Upgrades</span>
                    </div>
                    <div className="bg-white/40 border border-white/50 p-5 rounded-2xl">
                      <h4 className="font-bold text-xs text-gray-800 mb-2">What's New:</h4>
                      <ul className="list-disc pl-4 text-xs text-gray-600 space-y-1.5 mb-3">
                        <li><strong>Razorpay Integration Web Portal</strong>: Enabled customer dashboard payments directly inside browsers using Razorpay's native SDK overlays.</li>
                        <li><strong>Web Bypass Device Lockout</strong>: Added automatic detection to bypass device fingerprint locking when query routes come from `web_dashboard` portals.</li>
                      </ul>
                      <h4 className="font-bold text-xs text-gray-800 mb-2">Bug Fixes & Tweaks:</h4>
                      <ul className="list-disc pl-4 text-xs text-gray-600 space-y-1.5">
                        <li>Restored session validation check handlers inside the Electron client `billing:purchase-plan` API calls.</li>
                        <li>Added fallback simulated checkout flows if gateway secret key tokens are not configured on Render.</li>
                      </ul>
                    </div>
                  </div>

                  {/* Item v1.0.0 */}
                  <div className="relative">
                    <div className="absolute top-1.5 -left-[31px] w-4 h-4 rounded-full bg-emerald-500 border-4 border-white shadow-sm" />
                    <div className="flex flex-wrap gap-2.5 items-center mb-2">
                      <span className="text-base font-extrabold text-gray-900">v1.0.0</span>
                      <span className="text-xs text-gray-400 font-semibold font-mono">May 2026</span>
                      <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 tracking-wider">Initial Launch</span>
                    </div>
                    <div className="bg-white/40 border border-white/50 p-5 rounded-2xl">
                      <h4 className="font-bold text-xs text-gray-800 mb-2">What's New:</h4>
                      <ul className="list-disc pl-4 text-xs text-gray-600 space-y-1.5">
                        <li><strong>Shyoski Launch</strong>: Official launch of the next-generation stealth AI-assisted translation overlay.</li>
                        <li><strong>Hardware Display Capture Exclusion</strong>: Completed native operating system integration to exclude application frames from zoom shares, mettl tests, and screen records.</li>
                        <li><strong>6-Tier Access passes</strong>: Configured flexible hourly options (₹30 for 60 mins) and subscription memberships (1 day, 1 month, 3 months, 6 months, 1 year).</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PRIVACY VIEW (Entire, untrimmed content of Privacy.jsx) */}
            {view === 'privacy' && (
              <div className="w-full text-left max-w-3xl mx-auto">
                <div className="flex items-center justify-between border-b border-gray-200/30 pb-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-extrabold text-gray-900">Privacy Policy</h2>
                    <p className="text-xs text-gray-400 mt-1">Last Updated: June 11, 2026</p>
                  </div>
                  <button
                    onClick={() => switchView('landing')}
                    className="text-xs font-semibold px-4 py-2 bg-white border border-gray-200 rounded-full hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Return
                  </button>
                </div>

                <article className="text-sm text-gray-600 space-y-5 leading-relaxed pr-2 max-h-[60vh] overflow-y-auto">
                  <div>
                    <h3 className="font-bold text-gray-950 text-base mb-1">1. Information We Collect</h3>
                    <p>We only collect data necessary to provide and secure your subscription access. This is limited to:</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                      <li><strong>Account Credentials:</strong> Email addresses and securely hashed password records.</li>
                      <li><strong>Hardware Fingerprints:</strong> An encrypted, locally generated device signature used to verify authorization and enforce single-device session limits. We do not inspect, collect, or store individual hardware parameters on our servers.</li>
                      <li><strong>Usage Time Logs:</strong> Cumulative audio sync metrics needed to deduct active minutes from Hourly Pass subscribers.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-950 text-base mb-1">2. Audio Streams & Privacy Guarantee</h3>
                    <p>
                      Shyoski processes all microphone captures and system audio streams locally.
                      Audio buffers are kept only in volatile RAM registers for processing and are never written to disk, cached, or
                      transmitted to any third-party database. We do not inspect, log, or train models on user voice recordings.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-950 text-base mb-1">3. Third-Party Payments</h3>
                    <p>
                      We process transactions using Razorpay. We do not collect or store credit card details, CVVs, net banking
                      credentials, or UPI PINs. All financial interactions are handled directly by Razorpay under their strict
                      PCI-DSS safety standards.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-950 text-base mb-1">4. Data Retention & Deletion Rights</h3>
                    <p>
                      You have the right to inspect or delete your account records at any time. To request permanent account erasure
                      (which purges your email, transactions, and license logs from our database), contact us at `support@shyoski.com`.
                    </p>
                  </div>
                </article>
              </div>
            )}

            {/* SECURITY VIEW (Entire, untrimmed content of Security.jsx) */}
            {view === 'security' && (
              <div className="w-full text-left max-w-3xl mx-auto">
                <div className="flex items-center justify-between border-b border-gray-200/30 pb-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-extrabold text-gray-900">Display Protection & Privacy Policy</h2>
                    <p className="text-xs text-gray-400 mt-1">A technical whitepaper explaining the shielding mechanisms, data collection boundaries, and local encryption models built into Shyoski.</p>
                  </div>
                  <button
                    onClick={() => switchView('landing')}
                    className="text-xs font-semibold px-4 py-2 bg-white border border-gray-200 rounded-full hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Return
                  </button>
                </div>

                <article className="text-sm text-gray-600 space-y-5 leading-relaxed pr-2 max-h-[60vh] overflow-y-auto">
                  <div>
                    <h3 className="font-bold text-gray-950 text-base mb-1">1. Display Capture Exclusion Policy</h3>
                    <p>Shyoski prevents any operating system-level recording or snapshotting of its visual workspace. We implement native operating system and GPU-level display isolation flags to protect the application window context:</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1.5">
                      <li><strong>macOS Display Shield:</strong> We enforce hardware-level window exclusions that isolate the visual frame directly within the Apple Quartz Window Server framework, preventing screen recorders from obtaining the frame buffer.</li>
                      <li><strong>Windows Display Shield:</strong> On Windows, we trigger secure Desktop Window Manager (DWM) policies to exclude the application window overlay from desktop capture pipelines.</li>
                    </ul>
                    <p className="mt-2"><strong>Result:</strong> Any proctoring browser extension, screen sharing tool (Zoom, Teams, Discord), or background recording utility (OBS, Loom) will record a blank, transparent window instead of our overlay interface, keeping your workspace private.</p>
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-950 text-base mb-1">2. Audio Data and Stream Isolation</h3>
                    <p>Our transcription engines work completely locally on your hardware. We capture microphone loops and loopback devices using isolated thread pipes:</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1.5">
                      <li>Audio bytes are kept in volatile heap buffers for a maximum of 400 milliseconds to translate or match voice prints.</li>
                      <li><strong>No Local Storage:</strong> Shyoski never commits audio recordings, transcription databases, or session voice records to the local filesystem.</li>
                      <li>When the listening toggle is turned off, all memory pools allocated to stream audio are wiped immediately.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-950 text-base mb-1">3. Local Cryptographic Cache</h3>
                    <p>To support validation integrity and secure license persistence, the application caches an encrypted session token locally.
                       We leverage secure platform credential layers to seal and isolate the cached contents:</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1.5">
                      <li><strong>macOS Protection:</strong> Security keys are isolated using the system's native hardware credential storage framework.</li>
                      <li><strong>Windows Protection:</strong> Encryption is sealed using native cryptographic validation interfaces bound strictly to the active system user account context.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-950 text-base mb-1">4. Concurrency & Anti-Tampering Checks</h3>
                    <p>To prevent unauthorized license duplication, the licensing service validates encrypted hardware signature tags. If a system clock anomaly or sync tampering attempt is registered, the interface restricts unauthorized app execution immediately until verified by the server.</p>
                  </div>
                </article>
              </div>
            )}

            {/* TERMS VIEW (Entire, untrimmed content of Terms.jsx) */}
            {view === 'terms' && (
              <div className="w-full text-left max-w-3xl mx-auto">
                <div className="flex items-center justify-between border-b border-gray-200/30 pb-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-extrabold text-gray-900">End User Terms of Service</h2>
                    <p className="text-xs text-gray-400 mt-1">Last Updated & Effective Date: June 11, 2026</p>
                  </div>
                  <button
                    onClick={() => switchView('landing')}
                    className="text-xs font-semibold px-4 py-2 bg-white border border-gray-200 rounded-full hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Return
                  </button>
                </div>

                <article className="text-xs text-gray-600 space-y-5 leading-relaxed pr-2 max-h-[60vh] overflow-y-auto font-sans">
                  <p className="font-bold text-gray-800">PLEASE READ THIS END USER TERMS OF SERVICE AGREEMENT ("AGREEMENT") CAREFULLY. BY DOWNLOADING, INSTALLING, RUNNING, OR ACCESSING THE SHYOSKI DESKTOP APPLICATION, BACKEND API, AND WEBSITE (COLLECTIVELY, THE "SOFTWARE" OR "SERVICES"), YOU AGREE TO BE BOUND BY ALL TERMS AND CONDITIONS HEREIN. IF YOU DO NOT AGREE, YOU MUST IMMEDIATELY UNINSTALL THE APPLICATION AND CEASE USE OF THE SERVICES.</p>

                  <div>
                    <h3 className="font-extrabold text-gray-900 text-sm mb-1">1. Binding Contract & Eligibility</h3>
                    <p>This Agreement is a legally binding contract between you (the "User") and Shyoski Inc., including its founders, developers, affiliates, and representatives (collectively, the "Company"). You represent and warrant that you are at least 18 years of age (or the age of majority in your jurisdiction) and possess the legal authority to enter into this contract.</p>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-gray-900 text-sm mb-1">2. License Grant & Strict Restrictions</h3>
                    <p>Subject to your compliance with this Agreement and payment of the applicable subscription pass fees, the Company grants you a limited, non-exclusive, non-transferable, non-sublicensable, and revocable license to run the client executable binary on a single authorized device for your personal productivity. Under this license, you strictly agree NOT to:</p>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      <li>Decompile, disassemble, modify, adapt, translate, or reverse-engineer the client binaries or database protocols.</li>
                      <li>Sniff network packets, execute man-in-the-middle attacks, or spoof endpoint calls targeting `shysoki-api.onrender.com`.</li>
                      <li>Share, rent, lease, or distribute your account credentials to allow multiple devices or concurrent user sessions.</li>
                      <li>Bypass, disable, or tamper with the device fingerprinting mechanism or the system clock validation parameters.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-gray-900 text-sm mb-1">3. Subscription Passes & Payments</h3>
                    <p>
                      We process transactions securely using Razorpay in Indian Rupees (INR).
                      Subscriptions are purchased as access passes (Hourly top-ups, 1-Day, 1-Month, 3-Month, 6-Month, or 1-Year passes). 
                      <strong>All transactions are strictly non-refundable and final.</strong> The Company does not offer pro-rated refunds or credit rollbacks for unused subscription minutes or expired time periods.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-gray-900 text-sm mb-1">4. Absolute Disclaimer of Warranties ("AS IS")</h3>
                    <p>THE SOFTWARE AND SERVICES ARE PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS, WITHOUT WARRANTY OF ANY KIND, EITHER EXPRESS OR IMPLIED. TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE COMPANY EXCLUSIVELY DISCLAIMS ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO:</p>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      <li>IMPLIED WARRANTIES OF MERCHANTABILITY, SATISFACTORY QUALITY, AND FITNESS FOR A PARTICULAR PURPOSE.</li>
                      <li>ANY WARRANTY THAT THE SOFTWARE WILL BE COMPATIBLE WITH ALL FUTURE OPERATING SYSTEM REVISIONS OR SECURITY UPDATES.</li>
                      <li>ANY GUARANTEE THAT THE SCREEN CAPTURE EXCLUSION POLICIES AND WINDOW DISPLAY AFFINITY SHIELDING MECHANISMS WILL REMAIN UNDETECTED BY OR INVISIBLE TO THIRD-PARTY PROCTORING UTILITIES, RECORDING PLUGINS, WEB BROWSER EXTENSIONS, OR SCREEN-SHARING ALGORITHMS. THE USER ACKNOWLEDGES THAT DETECTION RISK IN REMOTE MONITORING SYSTEMS IS INHERENT AND ASSUMES SOLE LIABILITY FOR SUCH RISK.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-gray-900 text-sm mb-1">5. Limitation of Liability</h3>
                    <p>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL THE COMPANY, ITS FOUNDERS, DEVELOPERS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL, PUNITIVE, OR EXEMPLARY DAMAGES WHATSOEVER arising out of or related to your use, inability to use, or detection of the Software. This exclusion includes, without limitation, damages for academic disciplinary actions (suspension, expulsion), termination of employment, contract breaches, loss of income, system failures, database corruption, or security breaches.</p>
                    <p className="mt-1"><strong>CAPPED LIABILITY:</strong> IN ANY EVENT, THE TOTAL CUMULATIVE LIABILITY OF THE COMPANY ARISING FROM OR RELATED TO THIS AGREEMENT OR THE SOFTWARE SHALL NOT EXCEED THE EXACT CUMULATIVE SUBSCRIPTION PASS FEES PAID BY THE USER TO THE COMPANY IN THE TWELVE (12) MONTHS IMMEDIATELY PRECEDING THE CLAIM.</p>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-gray-900 text-sm mb-1">6. Unconditional Indemnification</h3>
                    <p>You agree to defend, indemnify, and hold harmless the Company, its founders, developers, partners, and agents from and against any and all claims, damages, obligations, losses, liabilities, costs, debt, and expenses arising from your violation of any term of this Agreement or third-party integrity codes (NDA breaches, academic codes, etc.).</p>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-gray-900 text-sm mb-1">7. Dispute Resolution & Governing Law</h3>
                    <p>This Agreement and any dispute arising out of or in connection with it shall be governed by, and construed in accordance with, the laws of the Republic of India. You and the Company agree that the courts located in Bengaluru, Karnataka, India, shall have exclusive personal jurisdiction and venue for any and all disputes arising under this Agreement.</p>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-gray-900 text-sm mb-1">8. Class Action & Jury Trial Waiver</h3>
                    <p>ALL CLAIMS MUST BE BOUND IN THE PARTIES' INDIVIDUAL CAPACITY, AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS OR REPRESENTATIVE PROCEEDING.</p>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-gray-900 text-sm mb-1">9. Severability & Entire Agreement</h3>
                    <p>If any provision of this Agreement is held to be invalid, illegal, or unenforceable, the remaining provisions shall remain in full force. This Agreement constitutes the entire agreement between you and the Company concerning the Software.</p>
                  </div>
                </article>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Global floating toast notification */}
      {toast.show && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: toast.color || '#3b82f6',
            color: '#ffffff',
            padding: '0.75rem 1.5rem',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            zIndex: 9999,
            fontWeight: '600',
            fontSize: '0.875rem'
          }}
        >
          {toast.message}
        </div>
      )}

      {/* Active Modal */}
      <AIAuthModal />
    </div>
  )
}

export default function ShyoskiAI() {
  return (
    <AIAuthProvider>
      <ShyoskiAIContent />
    </AIAuthProvider>
  )
}
