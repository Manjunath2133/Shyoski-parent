import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { token, license, syncLicense, purchasePlan } = useAuth();
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState(null);

  useEffect(() => {
    if (!token) {
      navigate('/');
    } else {
      syncLicense(token);
    }
  }, [token, navigate]);

  const handlePurchase = (plan) => {
    purchasePlan(plan, (loading) => {
      setLoadingPlan(loading ? plan : null);
    });
  };

  if (!token) return null;

  const getStatusClass = (status) => {
    if (status === 'active') return 'license-status-val active';
    if (status === 'expired') return 'license-status-val expired';
    return 'license-status-val trial';
  };

  const formatExpiry = () => {
    if (license?.expires_at) {
      return new Date(license.expires_at).toLocaleString();
    }
    return license?.type === 'hourly' ? 'No Expiry (Minutes Pool)' : 'Never';
  };

  return (
    <main className="dashboard-wrapper">
      <div className="dashboard-header">
        <h2>Your Subscription Dashboard</h2>
      </div>

      {license ? (
        <section className="license-hero">
          <div className="license-status-label">Active License Pass</div>
          <div className={getStatusClass(license.status)}>
            {license.status ? license.status.toUpperCase().replace('_', ' ') : 'FREE TRIAL'}
          </div>
          
          <div className="license-detail-grid">
            <div className="detail-item">
              <div className="detail-title">Pass Type</div>
              <div className="detail-value">{license.type ? license.type.toUpperCase() : '-'}</div>
            </div>
            <div className="detail-item">
              <div className="detail-title">Paid Minutes Left</div>
              <div className="detail-value">{Math.ceil(license.paid_minutes_left ?? 0)} mins</div>
            </div>
            <div className="detail-item">
              <div className="detail-title">Trial Queries Left</div>
              <div className="detail-value">{license.free_queries_left ?? 0}</div>
            </div>
            <div className="detail-item" style={{ gridColumn: 'span 2' }}>
              <div className="detail-title">Expiration Date</div>
              <div className="detail-value">{formatExpiry()}</div>
            </div>
          </div>
        </section>
      ) : (
        <section className="license-hero">
          <div className="license-status-label">Syncing License Status...</div>
          <div className="license-status-val trial">LOADING</div>
        </section>
      )}

      {/* Buy Section inside Dashboard */}
      <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', textAlign: 'center', color: '#0f172a' }}>
        Need More Credits? Buy an Access Pass
      </h3>
      
      <section className="pricing-grid" style={{ marginBottom: '4rem' }}>
        {/* Hourly Pass */}
        <div className="pricing-card">
          <h4>Hourly Pass</h4>
          <div className="pricing-price" style={{ fontSize: '2rem', margin: '1rem 0' }}>
            ₹30<span> / 60 mins</span>
          </div>
          <button
            className="btn btn-primary btn-dashboard-buy"
            onClick={() => handlePurchase('hourly')}
            disabled={loadingPlan === 'hourly'}
          >
            {loadingPlan === 'hourly' ? 'Connecting...' : 'Purchase Pass'}
          </button>
        </div>

        {/* Daily Pass */}
        <div className="pricing-card">
          <h4>1 Day Pass</h4>
          <div className="pricing-price" style={{ fontSize: '2rem', margin: '1rem 0' }}>
            ₹100<span> / 24 hours</span>
          </div>
          <button
            className="btn btn-primary btn-dashboard-buy"
            onClick={() => handlePurchase('daily')}
            disabled={loadingPlan === 'daily'}
          >
            {loadingPlan === 'daily' ? 'Connecting...' : 'Purchase Pass'}
          </button>
        </div>

        {/* Monthly Pass */}
        <div className="pricing-card">
          <h4>1 Month Pass</h4>
          <div className="pricing-price" style={{ fontSize: '2rem', margin: '1rem 0' }}>
            ₹3,000<span> / month</span>
          </div>
          <button
            className="btn btn-primary btn-dashboard-buy"
            onClick={() => handlePurchase('monthly')}
            disabled={loadingPlan === 'monthly'}
          >
            {loadingPlan === 'monthly' ? 'Connecting...' : 'Purchase Pass'}
          </button>
        </div>

        {/* Yearly Pass */}
        <div className="pricing-card">
          <h4>1 Year Pass</h4>
          <div className="pricing-price" style={{ fontSize: '2rem', margin: '1rem 0' }}>
            ₹12,000<span> / year</span>
          </div>
          <button
            className="btn btn-primary btn-dashboard-buy"
            onClick={() => handlePurchase('yearly')}
            disabled={loadingPlan === 'yearly'}
          >
            {loadingPlan === 'yearly' ? 'Connecting...' : 'Purchase Pass'}
          </button>
        </div>
      </section>
    </main>
  );
}
