import React from 'react';

export default function Terms() {
  return (
    <main className="doc-wrapper">
      <div className="doc-header">
        <h1>End User Terms of Service</h1>
        <p>Last Updated & Effective Date: June 11, 2026</p>
      </div>

      <article className="doc-content">
        <p><strong>PLEASE READ THIS END USER TERMS OF SERVICE AGREEMENT ("AGREEMENT") CAREFULLY.</strong> BY DOWNLOADING, INSTALLING, RUNNING, OR ACCESSING THE SHYOSKI DESKTOP APPLICATION, BACKEND API, AND WEBSITE (COLLECTIVELY, THE "SOFTWARE" OR "SERVICES"), YOU AGREE TO BE BOUND BY ALL TERMS AND CONDITIONS HEREIN. IF YOU DO NOT AGREE, YOU MUST IMMEDIATELY UNINSTALL THE APPLICATION AND CEASE USE OF THE SERVICES.</p>

        <h2>1. Binding Contract & Eligibility</h2>
        <p>This Agreement is a legally binding contract between you (the "User") and Shyoski Inc., including its founders, developers, affiliates, and representatives (collectively, the "Company"). You represent and warrant that you are at least 18 years of age (or the age of majority in your jurisdiction) and possess the legal authority to enter into this contract.</p>

        <h2>2. License Grant & Strict Restrictions</h2>
        <p>Subject to your compliance with this Agreement and payment of the applicable subscription pass fees, the Company grants you a limited, non-exclusive, non-transferable, non-sublicensable, and revocable license to run the client executable binary on a single authorized device for your personal productivity. Under this license, you strictly agree NOT to:</p>
        <ul>
          <li>Decompile, disassemble, modify, adapt, translate, or reverse-engineer the client binaries or database protocols.</li>
          <li>Sniff network packets, execute man-in-the-middle attacks, or spoof endpoint calls targeting `shysoki-api.onrender.com`.</li>
          <li>Share, rent, lease, or distribute your account credentials to allow multiple devices or concurrent user sessions.</li>
          <li>Bypass, disable, or tamper with the device fingerprinting mechanism or the system clock validation parameters.</li>
        </ul>

        <h2>3. Subscription Passes & Payments</h2>
        <p>
          We process transactions securely using Razorpay in Indian Rupees (INR).
          Subscriptions are purchased as access passes (Hourly top-ups, 1-Day, 1-Month, 3-Month, 6-Month, or 1-Year passes). 
          <strong>All transactions are strictly non-refundable and final.</strong> The Company does not offer pro-rated refunds or credit rollbacks for unused subscription minutes or expired time periods.
        </p>

        <h2>4. Absolute Disclaimer of Warranties ("AS IS")</h2>
        <p>THE SOFTWARE AND SERVICES ARE PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS, WITHOUT WARRANTY OF ANY KIND, EITHER EXPRESS OR IMPLIED. TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE COMPANY EXCLUSIVELY DISCLAIMS ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO:</p>
        <ul>
          <li>IMPLIED WARRANTIES OF MERCHANTABILITY, SATISFACTORY QUALITY, AND FITNESS FOR A PARTICULAR PURPOSE.</li>
          <li>ANY WARRANTY THAT THE SOFTWARE WILL BE COMPATIBLE WITH ALL FUTURE OPERATING SYSTEM REVISIONS OR SECURITY UPDATES.</li>
          <li>ANY GUARANTEE THAT THE SCREEN CAPTURE EXCLUSION POLICIES AND WINDOW DISPLAY AFFINITY SHIELDING MECHANISMS WILL REMAIN UNDETECTED BY OR INVISIBLE TO THIRD-PARTY PROCTORING UTILITIES, RECORDING PLUGINS, WEB BROWSER EXTENSIONS, OR SCREEN-SHARING ALGORITHMS. THE USER ACKNOWLEDGES THAT DETECTION RISK IN REMOTE MONITORING SYSTEMS IS INHERENT AND ASSUMES SOLE LIABILITY FOR SUCH RISK.</li>
        </ul>

        <h2>5. Limitation of Liability</h2>
        <p>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL THE COMPANY, ITS FOUNDERS, DEVELOPERS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL, PUNITIVE, OR EXEMPLARY DAMAGES WHATSOEVER arising out of or related to your use, inability to use, or detection of the Software. This exclusion includes, without limitation, damages for:</p>
        <ul>
          <li>Academic disciplinary actions, suspension, or expulsion by any educational institution.</li>
          <li>Termination of employment, contract breaches, career setbacks, loss of income, or blacklisting by employers.</li>
          <li>Fines, legal fees, or regulatory penalties.</li>
          <li>System failures, database corruption, or security breaches.</li>
        </ul>
        <p><strong>CAPPED LIABILITY:</strong> IN ANY EVENT, THE TOTAL CUMULATIVE LIABILITY OF THE COMPANY ARISING FROM OR RELATED TO THIS AGREEMENT OR THE SOFTWARE SHALL NOT EXCEED THE EXACT CUMULATIVE SUBSCRIPTION PASS FEES PAID BY THE USER TO THE COMPANY IN THE TWELVE (12) MONTHS IMMEDIATELY PRECEDING THE CLAIM.</p>

        <h2>6. Unconditional Indemnification</h2>
        <p>You agree to defend, indemnify, and hold harmless the Company, its founders, developers, partners, and agents from and against any and all claims, damages, obligations, losses, liabilities, costs, debt, and expenses (including but not limited to reasonable attorney's fees) arising from:</p>
        <ul>
          <li>Your violation of any term of this Agreement.</li>
          <li>Your violation of any third-party right, including academic integrity codes, employer codes of conduct, or non-disclosure agreements (NDAs).</li>
          <li>Any claim that your use of the software caused damage, breach of academic policy, or financial loss to any third party.</li>
        </ul>

        <h2>7. Dispute Resolution, Governing Law & Jurisdiction</h2>
        <p>This Agreement and any dispute arising out of or in connection with it shall be governed by, and construed in accordance with, the laws of the Republic of India. You and the Company agree that the courts located in Bengaluru, Karnataka, India, shall have exclusive personal jurisdiction and venue for any and all disputes arising under this Agreement.</p>

        <h2>8. Class Action & Jury Trial Waiver</h2>
        <p>ALL CLAIMS MUST BE BOUND IN THE PARTIES' INDIVIDUAL CAPACITY, AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS OR REPRESENTATIVE PROCEEDING. YOU AGREE THAT YOU WAIVE ANY RIGHT TO PARTICIPATE IN A CLASS ACTION OR REPRESENTATIVE LAWSUIT AGAINST THE COMPANY OR ITS FOUNDERS.</p>

        <h2>9. Severability & Entire Agreement</h2>
        <p>If any provision of this Agreement is held to be invalid, illegal, or unenforceable by a court of competent jurisdiction, the remaining provisions of this Agreement shall remain in full force and effect. This Agreement constitutes the entire agreement between you and the Company concerning the Software.</p>
      </article>
    </main>
  );
}
