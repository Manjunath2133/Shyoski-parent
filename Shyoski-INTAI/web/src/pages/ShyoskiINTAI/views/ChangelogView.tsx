import { ArrowLeft } from 'lucide-react'

interface ChangelogViewProps {
  switchView: (view: 'landing' | 'dashboard' | 'careers' | 'changelog' | 'privacy' | 'security' | 'terms') => void;
}

export default function ChangelogView({ switchView }: ChangelogViewProps) {
  return (
    <div className="w-full text-left max-w-3xl mx-auto">
      <div className="flex items-center justify-between border-b border-gray-200/30 pb-4 mb-6">
        <h2 className="text-2xl font-extrabold text-gray-900">Product Changelog</h2>
        <button
          onClick={() => switchView('landing')}
          className="text-xs font-semibold px-4 py-2 bg-white border border-gray-200 rounded-full hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return
        </button>
      </div>

      <p className="text-sm text-gray-500 leading-relaxed mb-8">
        Stay updated with the latest improvements, optimizations, and security updates compiled into the Shyoski platform.
      </p>

      <div className="space-y-8 pl-6 border-l-2 border-emerald-500/20 relative">
        {/* Item v1.0.1 */}
        <div className="relative mb-6">
          <div className="absolute top-1.5 -left-[31px] w-4 h-4 rounded-full bg-emerald-500 border-4 border-white shadow-sm" />
          <div className="flex flex-wrap gap-2.5 items-center mb-2">
            <span className="text-base font-extrabold text-gray-900">v1.0.1</span>
            <span className="text-xs text-gray-400 font-semibold font-mono">June 2026</span>
            <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 tracking-wider">Security Upgrades</span>
          </div>
          <div className="bg-white/40 border border-white/50 p-5 rounded-2xl">
            <h4 className="font-bold text-xs text-gray-800 mb-2">What's New:</h4>
            <ul className="list-disc pl-4 text-xs text-gray-600 space-y-1.5 mb-3">
              <li><strong>Razorpay Integration Web Portal</strong>: Enabled customer dashboard payments directly inside browsers using Razorpay's native SDK overlays.</li>
              <li><strong>Web Bypass Device Lockout</strong>: Added automatic detection to bypass device fingerprint locking when query routes come from `web_dashboard` portals.</li>
            </ul>
            <h4 className="font-bold text-xs text-gray-800 mb-2">Bug Fixes & Tweaks:</h4>
            <ul className="list-disc pl-4 text-xs text-gray-600 space-y-1.5">
              <li>Restored session validation check handlers inside the Electron client `billing:purchase-plan` API calls.</li>
              <li>Added fallback simulated checkout flows if gateway secret key tokens are not configured on Render.</li>
            </ul>
          </div>
        </div>

        {/* Item v1.0.0 */}
        <div className="relative">
          <div className="absolute top-1.5 -left-[31px] w-4 h-4 rounded-full bg-emerald-500 border-4 border-white shadow-sm" />
          <div className="flex flex-wrap gap-2.5 items-center mb-2">
            <span className="text-base font-extrabold text-gray-900">v1.0.0</span>
            <span className="text-xs text-gray-400 font-semibold font-mono">May 2026</span>
            <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 tracking-wider">Initial Launch</span>
          </div>
          <div className="bg-white/40 border border-white/50 p-5 rounded-2xl">
            <h4 className="font-bold text-xs text-gray-800 mb-2">What's New:</h4>
            <ul className="list-disc pl-4 text-xs text-gray-600 space-y-1.5">
              <li><strong>Shyoski Launch</strong>: Official launch of the next-generation stealth AI-assisted translation overlay.</li>
              <li><strong>Hardware Display Capture Exclusion</strong>: Completed native operating system integration to exclude application frames from zoom shares, mettl tests, and screen records.</li>
              <li><strong>6-Tier Access passes</strong>: Configured flexible hourly options (₹30 for 60 mins) and subscription memberships (1 day, 1 month, 3 months, 6 months, 1 year).</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
