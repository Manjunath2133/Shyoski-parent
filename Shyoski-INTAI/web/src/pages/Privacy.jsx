import React from 'react';

export default function Privacy() {
  return (
    <main className="doc-wrapper">
      <div className="doc-header">
        <h1 style={{ color: '#0f172a' }}>Privacy Policy</h1>
        <p>Last Updated: June 11, 2026</p>
      </div>

      <article className="doc-content">
        <h2>1. Information We Collect</h2>
        <p>We only collect data necessary to provide and secure your subscription access. This is limited to:</p>
        <ul>
          <li><strong>Account Credentials:</strong> Email addresses and securely hashed password records.</li>
          <li><strong>Hardware Fingerprints:</strong> An encrypted, locally generated device signature used to verify authorization and enforce single-device session limits. We do not inspect, collect, or store individual hardware parameters on our servers.</li>
          <li><strong>Usage Time Logs:</strong> Cumulative audio sync metrics needed to deduct active minutes from Hourly Pass subscribers.</li>
        </ul>

        <h2>2. Audio Streams & Privacy Guarantee</h2>
        <p>
          Shyoski processes all microphone captures and system audio streams locally.
          Audio buffers are kept only in volatile RAM registers for processing and are never written to disk, cached, or
          transmitted to any third-party database. We do not inspect, log, or train models on user voice recordings.
        </p>

        <h2>3. Third-Party Payments</h2>
        <p>
          We process transactions using Razorpay. We do not collect or store credit card details, CVVs, net banking
          credentials, or UPI PINs. All financial interactions are handled directly by Razorpay under their strict
          PCI-DSS safety standards.
        </p>

        <h2>4. Data Retention & Deletion Rights</h2>
        <p>
          You have the right to inspect or delete your account records at any time. To request permanent account erasure
          (which purges your email, transactions, and license logs from our database), contact us at `support@shyoski.com`.
        </p>
      </article>
    </main>
  );
}
