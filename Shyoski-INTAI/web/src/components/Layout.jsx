import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';
import AuthModal from './AuthModal';
import ShyoskiTermsBar from './ShyoskiTermsBar';

export default function Layout({ children }) {
  const {
    token,
    email,
    logout,
    setAuthModalOpen,
    setAuthModalMode,
    toast
  } = useAuth();

  const location = useLocation();
  const navigate = useNavigate();

  const isDashboard = location.pathname.includes('/dashboard');

  // === Visual: scroll-aware navbar ===
  useEffect(() => {
    const header = document.querySelector('header');
    if (!header) return;
    const onScroll = () => {
      header.classList.toggle('scrolled', window.scrollY > 12);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // === Visual: scroll-reveal fade-in for [data-reveal] elements ===
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]');
    if (!els.length) return;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); observer.unobserve(e.target); } }),
      { threshold: 0.12 }
    );
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [location.pathname]);

  const handleAuthTrigger = () => {
    if (token) {
      navigate('/dashboard');
    } else {
      setAuthModalMode('signin');
      setAuthModalOpen(true);
    }
  };

  return (
    <>
      <ShyoskiTermsBar />
      {/* Header Navigation */}
      <header>
        <div className="nav-container">
          <Link to="/" style={{ display: 'inline-flex' }}>
            <Logo variant="header" />
          </Link>
          <nav className="nav-links">
            {isDashboard ? (
              <>
                <Link to="/" className="nav-link">Home</Link>
                <span id="user-display" className="user-badge">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <span id="user-email">{email || 'loading...'}</span>
                </span>
                <button onClick={logout} className="btn btn-secondary">Sign Out</button>
              </>
            ) : (
              <>
                {location.pathname === '/' || location.pathname === '/index.html' ? (
                  <>
                    <a href="#features" className="nav-link">Features</a>
                    <a href="#compare" className="nav-link">Comparison</a>
                    <a href="#pricing" className="nav-link">Pricing</a>
                  </>
                ) : (
                  <>
                    <Link to="/#features" className="nav-link">Features</Link>
                    <Link to="/#compare" className="nav-link">Comparison</Link>
                    <Link to="/#pricing" className="nav-link">Pricing</Link>
                  </>
                )}
                <Link to="/security" className="nav-link">Security</Link>
                <Link to="/changelog" className="nav-link">Changelog</Link>
                <Link to="/careers" className="nav-link">Careers</Link>
                
                {token ? (
                  <Link to="/dashboard" className="btn btn-secondary">Go to Dashboard</Link>
                ) : (
                  <button onClick={handleAuthTrigger} className="btn btn-primary">Sign In / Sign Up</button>
                )}
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      {children}

      {/* Premium Enterprise Footer */}
      <footer>
        <div className="footer-container">
          <div className="footer-grid">
            <div className="footer-col brand-col">
              <Link to="/">
                <Logo variant="footer" />
              </Link>
              <p className="footer-desc">Elite translation and screen-shielded resolution companions. Secure your performance limits.</p>
            </div>
            <div className="footer-col">
              <h5>Product</h5>
              <ul className="footer-links">
                <li><a href="/#features">Features</a></li>
                <li><a href="/#pricing">Pricing</a></li>
                <li><a href="https://github.com/Manjunath2133/shysoki/releases" target="_blank" rel="noopener noreferrer">Downloads</a></li>
                <li><Link to="/security">Security Shield</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h5>Company</h5>
              <ul className="footer-links">
                <li><Link to="/careers">Careers</Link></li>
                <li><Link to="/changelog">Changelog</Link></li>
                <li><Link to="/security">Privacy Promise</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h5>Legal</h5>
              <ul className="footer-links">
                <li><Link to="/terms">Terms of Service</Link></li>
                <li><Link to="/privacy">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 Shyoski Inc. All rights reserved.</span>
            <span>Designed for next-generation performance.</span>
          </div>
        </div>
      </footer>

      {/* Global Modals */}
      <AuthModal />

      {/* Global floating toast notification */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: toast.color || 'var(--accent-blue)',
          color: '#ffffff',
          padding: '0.75rem 1.5rem',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)',
          zIndex: 9999,
          fontWeight: '600',
          fontSize: '0.875rem',
          fontFamily: 'var(--font-family)',
          letterSpacing: '-0.01em',
          maxWidth: '340px',
          animation: 'slideInUp 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) both'
        }}>
          {toast.message}
        </div>
      )}
    </>
  );
}
