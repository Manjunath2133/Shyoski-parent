import { ArrowLeft, RefreshCw } from 'lucide-react'

interface DashboardViewProps {
  email: string | null;
  token: string | null;
  license: any;
  syncLicense: (currentToken?: string | null) => Promise<void>;
  handlePurchase: (plan: string) => void;
  loadingPlan: string | null;
  switchView: (view: 'landing' | 'dashboard' | 'careers' | 'changelog' | 'privacy' | 'security' | 'terms') => void;
  logout: () => void;
}

export default function DashboardView({
  email,
  token,
  license,
  syncLicense,
  handlePurchase,
  loadingPlan,
  switchView,
  logout
}: DashboardViewProps) {
  return (
    <div className="w-full text-left">
      <div className="flex items-center justify-between border-b border-gray-200/30 pb-4 mb-6">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900">Your Subscription Dashboard</h2>
          <p className="text-xs text-gray-500 font-mono mt-1">Authorized Device Session: web_dashboard ({email})</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => switchView('landing')}
            className="text-xs font-semibold px-4 py-2 bg-white border border-gray-200 rounded-full hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Landing Home
          </button>
          <button
            onClick={() => {
              logout()
              switchView('landing')
            }}
            className="text-xs font-semibold px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-full hover:bg-red-100 flex items-center gap-2 cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>

      {license ? (
        <div className="bg-white/60 border border-white/60 p-6 rounded-3xl shadow-sm mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative overflow-hidden">
          <div className="col-span-1 sm:col-span-2 lg:col-span-4 flex justify-between items-center mb-2">
            <div className="text-xs font-extrabold text-emerald-800 tracking-wider uppercase">Active License Pass</div>
            <div className={`text-[10px] font-extrabold px-3 py-1 rounded-full text-white uppercase tracking-wider ${license.status === 'active' ? 'bg-emerald-600' : 'bg-yellow-600'}`}>
              {license.status ? license.status.toUpperCase().replace('_', ' ') : 'FREE TRIAL'}
            </div>
          </div>

          <div className="bg-white/40 p-4 rounded-2xl border border-white/50">
            <div className="text-xs text-gray-400 mb-1">Pass Type</div>
            <div className="text-base font-extrabold text-gray-900">{license.type ? license.type.toUpperCase() : '-'}</div>
          </div>
          <div className="bg-white/40 p-4 rounded-2xl border border-white/50">
            <div className="text-xs text-gray-400 mb-1">Paid Minutes Left</div>
            <div className="text-base font-extrabold text-gray-900">{Math.ceil(license.paid_minutes_left ?? 0)} mins</div>
          </div>
          <div className="bg-white/40 p-4 rounded-2xl border border-white/50">
            <div className="text-xs text-gray-400 mb-1">Trial Queries Left</div>
            <div className="text-base font-extrabold text-gray-900">{license.free_queries_left ?? 0}</div>
          </div>
          <div className="bg-white/40 p-4 rounded-2xl border border-white/50">
            <div className="text-xs text-gray-400 mb-1">Expiration Date</div>
            <div className="text-xs font-bold text-gray-900 leading-relaxed truncate">
              {license.expires_at ? new Date(license.expires_at).toLocaleString() : license.type === 'hourly' ? 'No Expiry (Minutes Pool)' : 'Never'}
            </div>
          </div>

          <div className="col-span-1 sm:col-span-2 lg:col-span-4 pt-4 flex justify-end">
            <button
              onClick={() => syncLicense(token)}
              className="text-xs font-semibold px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Sync License Status
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white/60 border border-white/60 p-8 rounded-3xl text-center shadow-sm mb-8 flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
          <div className="font-semibold text-gray-700">Syncing licensing credentials...</div>
        </div>
      )}

      <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">Need More Credits? Buy an Access Pass</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/50 p-5 rounded-2xl border border-white/40 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-gray-800 text-sm">Hourly Pass</h4>
            <div className="text-xl font-extrabold text-emerald-600 my-1">₹30<span> / 60 mins</span></div>
          </div>
          <button onClick={() => handlePurchase('hourly')} disabled={loadingPlan === 'hourly'} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-xl text-xs cursor-pointer mt-4">
            {loadingPlan === 'hourly' ? 'Connecting...' : 'Purchase Pass'}
          </button>
        </div>
        <div className="bg-white/50 p-5 rounded-2xl border border-white/40 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-gray-800 text-sm">1 Day Pass</h4>
            <div className="text-xl font-extrabold text-emerald-600 my-1">₹100<span> / 24 hours</span></div>
          </div>
          <button onClick={() => handlePurchase('daily')} disabled={loadingPlan === 'daily'} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-xl text-xs cursor-pointer mt-4">
            {loadingPlan === 'daily' ? 'Connecting...' : 'Purchase Pass'}
          </button>
        </div>
        <div className="bg-white/50 p-5 rounded-2xl border border-white/40 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-gray-800 text-sm">1 Month Pass</h4>
            <div className="text-xl font-extrabold text-emerald-600 my-1">₹3,000<span> / month</span></div>
          </div>
          <button onClick={() => handlePurchase('monthly')} disabled={loadingPlan === 'monthly'} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-xl text-xs cursor-pointer mt-4">
            {loadingPlan === 'monthly' ? 'Connecting...' : 'Purchase Pass'}
          </button>
        </div>
        <div className="bg-white/50 p-5 rounded-2xl border border-white/40 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-gray-800 text-sm">1 Year Pass</h4>
            <div className="text-xl font-extrabold text-emerald-600 my-1">₹12,000<span> / year</span></div>
          </div>
          <button onClick={() => handlePurchase('yearly')} disabled={loadingPlan === 'yearly'} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-xl text-xs cursor-pointer mt-4">
            {loadingPlan === 'yearly' ? 'Connecting...' : 'Purchase Pass'}
          </button>
        </div>
      </div>
    </div>
  )
}
