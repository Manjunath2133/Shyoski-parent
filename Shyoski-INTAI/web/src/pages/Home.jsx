import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { purchasePlan } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState(null);

  const handleBuy = (plan) => {
    purchasePlan(plan, (loading) => {
      setLoadingPlan(loading ? plan : null);
    });
  };

  return (
    <main>
      {/* Hero Section */}
      <section className="hero">
        <h1 style={{ color: '#1e293b' }}>
          The Professional AI Companion.
          <br />
          Unrecordable. Untraceable.
        </h1>
        <p>
          Deliver elite performance with silent real-time audio transcription, translation, and instant AI resolution.
          Shyoski uses native hardware protection layers to hide completely from screen recorders, capture software, and streaming tools.
        </p>

        <div className="hero-actions">
          {/* macOS Download */}
          <a
            href="https://github.com/Manjunath2133/shysoki/releases/latest/download/Shyoski-1.0.0-arm64.dmg"
            className="btn btn-primary"
            style={{ padding: '1rem 2rem', fontSize: '1rem', borderRadius: '12px' }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginRight: '10px' }}
            >
              <path d="M12 20.39c-1.36 0-2.82-.44-3.66-1.12-2.18-1.74-2.82-5.46-1.42-8.24 1.4-2.78 4.38-4.26 6.94-3.32 1.34.5 2.14 1.32 3 1.32.88 0 1.66-.82 3-1.32 2.56-.94 5.54.54 6.94 3.32 1.4 2.78.76 6.5-1.42 8.24-.84.68-2.3 1.12-3.66 1.12-1.32 0-2.16-.48-3.1-.48-.94 0-1.78.48-3.1.48zM12 7.61a3.18 3.18 0 0 1 3.2-3.21v.01c0-1.77-1.44-3.21-3.2-3.21s-3.2 1.44-3.2 3.2c0 1.78 1.44 3.21 3.2 3.21z" />
            </svg>
            Download for macOS
          </a>
          {/* Windows Download */}
          <a
            href="https://github.com/Manjunath2133/shysoki/releases/latest/download/Shyoski.Setup.1.0.0.exe"
            className="btn btn-secondary"
            style={{ padding: '1rem 2rem', fontSize: '1rem', borderRadius: '12px' }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginRight: '10px' }}
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
            Download for Windows
          </a>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <h2 className="section-title">Designed for Mission-Critical Environments</h2>
        <p className="section-subtitle">
          We protect your workspace using kernel-level API hooks and display isolation policies.
        </p>
        <div className="grid-3">
          <div className="card">
            <div className="card-icon">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h3>Hardware-Level Protection</h3>
            <p>
              Enforces secure, native display isolation layers. Stays completely invisible on Mercer Mettl, Proctorio,
              Zoom, Teams, and Discord screenshots.
            </p>
          </div>
          <div className="card">
            <div className="card-icon">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8V12L14 14" />
              </svg>
            </div>
            <h3>Active Listening Tracker</h3>
            <p>
              Only pay for active minutes spent transcribing. The app detects speech silence to optimize and preserve
              your billing balance automatically.
            </p>
          </div>
          <div className="card">
            <div className="card-icon">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h3>Hardware Fingerprint Lock</h3>
            <p>
              Secure hardware binding. Licenses are encrypted locally using native OS storage layers to enforce strict
              single-user device authorization.
            </p>
          </div>
        </div>
      </section>

      {/* Product Comparison Matrix */}
      <section id="compare" className="comparison-section">
        <h2 className="section-title">How Shyoski Compares</h2>
        <p className="section-subtitle">
          A detailed breakdown of why top industry professionals choose Shyoski over general AI tools.
        </p>
        <div className="compare-table-wrapper">
          <table className="compare-table">
            <thead>
              <tr>
                <th>Capability</th>
                <th>Shyoski Enterprise</th>
                <th>Standard AI Assistant</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Display Capture Protection (Anti-Screenshot)</td>
                <td className="compare-check">✔ Hardware level</td>
                <td>❌ None (Capturable)</td>
              </tr>
              <tr>
                <td>System Audio & Microphone Loopback capture</td>
                <td className="compare-check">✔ Local low-latency</td>
                <td>❌ Web browser only</td>
              </tr>
              <tr>
                <td>Local Session Encryption</td>
                <td className="compare-check">✔ safeStorage API</td>
                <td>❌ Plain text cache</td>
              </tr>
              <tr>
                <td>Silent Lockout (Ghost Mode)</td>
                <td className="compare-check">✔ Alt+Shift+G Override</td>
                <td>❌ Standard popups</td>
              </tr>
              <tr>
                <td>Flexible Micro-billing</td>
                <td className="compare-check">✔ Hourly & Duration Passes</td>
                <td>❌ Fixed monthly only</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials">
        <h2 className="section-title">Trusted by Elite Professionals</h2>
        <p className="section-subtitle">
          Read how Shyoski is changing how engineers, translators, and managers work.
        </p>
        <div className="testimonial-grid">
          <div className="testimonial-card">
            <p>
              "The display exclusion is magic. When I share my screen with clients, they only see my code editor while
              Shyoski works in the background without stealing focus. Worth every rupee."
            </p>
            <div className="testimonial-author">
              <div className="author-avatar"></div>
              <div className="author-info">
                <h5>Aravind K.</h5>
                <span>Senior Systems Engineer</span>
              </div>
            </div>
          </div>
          <div className="testimonial-card">
            <p>
              "I use the Hourly Pass for my international client calls. The audio translation latency is virtually
              imperceptible, and I only pay for the exact hours I spend talking."
            </p>
            <div className="testimonial-author">
              <div className="author-avatar"></div>
              <div className="author-info">
                <h5>Sarah M.</h5>
                <span>Freelance Technical Translator</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="pricing-section">
        <h2 className="section-title">Choose Your Access Pass</h2>
        <p className="section-subtitle">
          Secure, high-converting checkout via Razorpay. Upgrade or top-up anytime.
        </p>
        <div className="pricing-grid">
          {/* Hourly Pass */}
          <div className="pricing-card">
            <h4>Hourly Pass</h4>
            <p className="pricing-desc">Pay-as-you-go audio resolution time.</p>
            <div className="pricing-price">
              ₹30<span> / 60 mins</span>
            </div>
            <ul className="pricing-features">
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                60 Transcription Minutes
              </li>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Unlimited AI Queries
              </li>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Stealth Shield Enabled
              </li>
            </ul>
            <button
              className="btn btn-secondary btn-plan-buy"
              onClick={() => handleBuy('hourly')}
              disabled={loadingPlan === 'hourly'}
            >
              {loadingPlan === 'hourly' ? 'Connecting...' : 'Get Pass'}
            </button>
          </div>

          {/* Daily Pass */}
          <div className="pricing-card">
            <h4>1 Day Pass</h4>
            <p className="pricing-desc">Perfect for temporary high-usage days.</p>
            <div className="pricing-price">
              ₹100<span> / 24 hours</span>
            </div>
            <ul className="pricing-features">
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                24 Hours Unlimited Time
              </li>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Unlimited AI Queries
              </li>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Single Device Lock
              </li>
            </ul>
            <button
              className="btn btn-secondary btn-plan-buy"
              onClick={() => handleBuy('daily')}
              disabled={loadingPlan === 'daily'}
            >
              {loadingPlan === 'daily' ? 'Connecting...' : 'Get Pass'}
            </button>
          </div>

          {/* Monthly Pass */}
          <div className="pricing-card popular">
            <h4>1 Month Pass</h4>
            <p className="pricing-desc">Our most popular duration choice.</p>
            <div className="pricing-price">
              ₹3,000<span> / month</span>
            </div>
            <ul className="pricing-features">
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                30 Days Unlimited Time
              </li>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Priority Resolution Speed
              </li>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Premium Support Ticket
              </li>
            </ul>
            <button
              className="btn btn-primary btn-plan-buy"
              onClick={() => handleBuy('monthly')}
              disabled={loadingPlan === 'monthly'}
            >
              {loadingPlan === 'monthly' ? 'Connecting...' : 'Get Pass'}
            </button>
          </div>

          {/* 3 Months Pass */}
          <div className="pricing-card">
            <h4>3 Months Pass</h4>
            <p className="pricing-desc">Extended productivity support.</p>
            <div className="pricing-price">
              ₹6,000<span> / 3 mos</span>
            </div>
            <ul className="pricing-features">
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                90 Days Unlimited Time
              </li>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Priority Resolution Speed
              </li>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Device Binding Transfers
              </li>
            </ul>
            <button
              className="btn btn-secondary btn-plan-buy"
              onClick={() => handleBuy('3_months')}
              disabled={loadingPlan === '3_months'}
            >
              {loadingPlan === '3_months' ? 'Connecting...' : 'Get Pass'}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
