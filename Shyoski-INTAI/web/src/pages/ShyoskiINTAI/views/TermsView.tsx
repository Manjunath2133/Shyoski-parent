import { ArrowLeft } from 'lucide-react'

interface TermsViewProps {
  switchView: (view: 'landing' | 'dashboard' | 'careers' | 'changelog' | 'privacy' | 'security' | 'terms') => void;
}

export default function TermsView({ switchView }: TermsViewProps) {
  return (
    <div className="w-full text-left max-w-3xl mx-auto font-sans">
      <div className="flex items-center justify-between border-b border-gray-200/30 pb-4 mb-6 font-sans">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 font-sans">End User Terms of Service</h2>
          <p className="text-xs text-gray-400 mt-1">Last Updated & Effective Date: June 11, 2026</p>
        </div>
        <button
          onClick={() => switchView('landing')}
          className="text-xs font-semibold px-4 py-2 bg-white border border-gray-200 rounded-full hover:bg-gray-50 flex items-center gap-2 cursor-pointer font-sans"
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
  )
}
