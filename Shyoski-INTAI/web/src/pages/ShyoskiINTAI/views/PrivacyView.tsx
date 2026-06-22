import { ArrowLeft } from 'lucide-react'

interface PrivacyViewProps {
  switchView: (view: 'landing' | 'dashboard' | 'careers' | 'changelog' | 'privacy' | 'security' | 'terms') => void;
}

export default function PrivacyView({ switchView }: PrivacyViewProps) {
  return (
    <div className="w-full text-left max-w-3xl mx-auto">
      <div className="flex items-center justify-between border-b border-gray-200/30 pb-4 mb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 font-sans">Privacy Policy</h2>
          <p className="text-xs text-gray-400 mt-1">Last Updated: June 11, 2026</p>
        </div>
        <button
          onClick={() => switchView('landing')}
          className="text-xs font-semibold px-4 py-2 bg-white border border-gray-200 rounded-full hover:bg-gray-50 flex items-center gap-2 cursor-pointer font-sans"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return
        </button>
      </div>

      <article className="text-sm text-gray-600 space-y-5 leading-relaxed pr-2 max-h-[60vh] overflow-y-auto font-sans">
        <div>
          <h3 className="font-bold text-gray-955 text-base mb-1 font-sans">1. Information We Collect</h3>
          <p>We only collect data necessary to provide and secure your subscription access. This is limited to:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Account Credentials:</strong> Email addresses and securely hashed password records.</li>
            <li><strong>Hardware Fingerprints:</strong> An encrypted, locally generated device signature used to verify authorization and enforce single-device session limits. We do not inspect, collect, or store individual hardware parameters on our servers.</li>
            <li><strong>Usage Time Logs:</strong> Cumulative audio sync metrics needed to deduct active minutes from Hourly Pass subscribers.</li>
          </ul>
        </div>

        <div>
          <h3 className="font-bold text-gray-955 text-base mb-1 font-sans">2. Audio Streams & Privacy Guarantee</h3>
          <p>
            Shyoski processes all microphone captures and system audio streams locally.
            Audio buffers are kept only in volatile RAM registers for processing and are never written to disk, cached, or
            transmitted to any third-party database. We do not inspect, log, or train models on user voice recordings.
          </p>
        </div>

        <div>
          <h3 className="font-bold text-gray-955 text-base mb-1 font-sans">3. Third-Party Payments</h3>
          <p>
            We process transactions using Razorpay. We do not collect or store credit card details, CVVs, net banking
            credentials, or UPI PINs. All financial interactions are handled directly by Razorpay under their strict
            PCI-DSS safety standards.
          </p>
        </div>

        <div>
          <h3 className="font-bold text-gray-955 text-base mb-1 font-sans">4. Data Retention & Deletion Rights</h3>
          <p>
            You have the right to inspect or delete your account records at any time. To request permanent account erasure
            (which purges your email, transactions, and license logs from our database), contact us at `support@shyoski.com`.
          </p>
        </div>
      </article>
    </div>
  )
}
