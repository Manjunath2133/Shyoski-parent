import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

const TOKEN_KEY = 'shyoski_user_token';
const EMAIL_KEY = 'shyoski_user_email';

export const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:'
    ? 'http://localhost:5005'
    : 'https://shysoki-api.onrender.com';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [email, setEmail] = useState(() => localStorage.getItem(EMAIL_KEY));
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('signin'); // 'signin', 'signup', 'forgot'
  
  const [license, setLicense] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', color: '' });

  const showToast = (message, color) => {
    setToast({ show: true, message, color });
    setTimeout(() => {
      setToast(prev => prev.message === message ? { ...prev, show: false } : prev);
    }, 4500);
  };

  const login = (newToken, newEmail) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(EMAIL_KEY, newEmail);
    setToken(newToken);
    setEmail(newEmail);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
    setToken(null);
    setEmail(null);
    setLicense(null);
  };

  const syncLicense = async (currentToken = token) => {
    if (!currentToken) return;
    try {
      const res = await fetch(`${API_URL}/api/license/status`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify({ deviceId: 'web_dashboard' })
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          logout();
          return;
        }
        throw new Error('Could not sync license status.');
      }

      const data = await res.json();
      setLicense(data);
    } catch (err) {
      showToast(err.message, 'var(--danger)');
    }
  };

  const purchasePlan = async (plan, setLoading, onSuccess) => {
    if (!token) {
      setAuthModalMode('signin');
      setAuthModalOpen(true);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/payments/create-order`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plan })
      });

      const orderData = await res.json();
      
      if (!res.ok) {
        throw new Error(orderData.error || 'Failed to create payment order');
      }

      setLoading(false);

      if (orderData.simulated) {
        showToast(`Simulation checkout complete! Verifying...`, 'var(--warning)');
        
        // Instantly verify mock orders
        const verifyRes = await fetch(`${API_URL}/api/payments/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            orderId: orderData.order_id,
            paymentId: 'pay_simulated_web'
          })
        });

        const verifyData = await verifyRes.json();
        if (verifyRes.ok && verifyData.success) {
          showToast(`Successfully upgraded to ${plan.toUpperCase()}! (Sandbox Simulation)`, 'var(--success)');
          await syncLicense(token);
          if (onSuccess) onSuccess();
        } else {
          throw new Error(verifyData.error || 'Verification failed');
        }
      } else {
        // Trigger real Razorpay web SDK payment popover
        const options = {
          key: orderData.key_id,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "Shyoski",
          description: `Purchase ${plan.toUpperCase()} Subscription`,
          order_id: orderData.order_id,
          handler: async function (response) {
            showToast('Payment successful. Verifying session...', 'var(--accent-glow)');
            
            try {
              const verifyRes = await fetch(`${API_URL}/api/payments/verify`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  orderId: orderData.order_id,
                  paymentId: response.razorpay_payment_id,
                  signature: response.razorpay_signature
                })
              });

              const verifyData = await verifyRes.json();
              if (verifyRes.ok && verifyData.success) {
                showToast('Payment verified! Pass activated.', 'var(--success)');
                await syncLicense(token);
                if (onSuccess) onSuccess();
              } else {
                showToast(`Verification failed: ${verifyData.error}`, 'var(--danger)');
              }
            } catch (err) {
              showToast('Verification failed due to connectivity issues.', 'var(--danger)');
            }
          },
          prefill: {
            email: email
          },
          theme: {
            color: "#3b82f6"
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (err) {
      showToast(err.message, 'var(--danger)');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      syncLicense(token);
    }
  }, [token]);

  return (
    <AuthContext.Provider value={{
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
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
