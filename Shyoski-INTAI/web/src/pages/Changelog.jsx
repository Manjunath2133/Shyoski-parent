import React from 'react';

export default function Changelog() {
  return (
    <main className="doc-wrapper" style={{ maxWidth: '900px' }}>
      <div className="doc-header">
        <h1 style={{ color: '#0f172a' }}>Product Changelog</h1>
        <p>Stay updated with the latest improvements, optimizations, and security updates compiled into the Shyoski platform.</p>
      </div>

      {/* Timeline */}
      <div className="timeline">
        {/* v1.0.1 */}
        <div className="timeline-item">
          <div className="timeline-dot"></div>
          <div className="timeline-header">
            <span className="timeline-version">v1.0.1</span>
            <span className="timeline-date">June 2026</span>
            <span className="tag tag-new">Security Upgrades</span>
          </div>
          <div className="changelog-card">
            <h4>What's New:</h4>
            <ul>
              <li><strong>Razorpay Integration Web Portal</strong>: Enabled customer dashboard payments directly inside browsers using Razorpay's native SDK overlays.</li>
              <li><strong>Web Bypass Device Lockout</strong>: Added automatic detection to bypass device fingerprint locking when query routes come from `web_dashboard` portals.</li>
            </ul>
            <h4>Bug Fixes & Tweaks:</h4>
            <ul>
              <li>Restored session validation check handlers inside the Electron client `billing:purchase-plan` API calls.</li>
              <li>Added fallback simulated checkout flows if gateway secret key tokens are not configured on Render.</li>
            </ul>
          </div>
        </div>

        {/* v1.0.0 */}
        <div className="timeline-item">
          <div className="timeline-dot"></div>
          <div className="timeline-header">
            <span className="timeline-version">v1.0.0</span>
            <span className="timeline-date">May 2026</span>
            <span className="tag tag-new">Initial Launch</span>
          </div>
          <div className="changelog-card">
            <h4>What's New:</h4>
            <ul>
              <li><strong>Shyoski Launch</strong>: Official launch of the next-generation stealth AI-assisted translation overlay.</li>
              <li><strong>Hardware Display Capture Exclusion</strong>: Completed native operating system integration to exclude application frames from zoom shares, mettl tests, and screen records.</li>
              <li><strong>6-Tier Access passes</strong>: Configured flexible hourly options (₹30 for 60 mins) and subscription memberships (1 day, 1 month, 3 months, 6 months, 1 year).</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
