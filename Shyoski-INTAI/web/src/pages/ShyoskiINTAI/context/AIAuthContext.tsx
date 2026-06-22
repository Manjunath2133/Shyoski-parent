import React, { createContext, useState, useEffect, useContext } from 'react'

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
