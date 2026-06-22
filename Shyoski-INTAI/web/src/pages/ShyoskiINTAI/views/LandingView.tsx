import {
  BrainCircuit,
  Smartphone,
  Globe,
  Lock,
  Terminal,
  Briefcase,
  RefreshCw,
  FileText,
  User
} from 'lucide-react'
import { MagneticButton } from '../../../../../../src/components/ui/MagneticButton'
import { Canvas } from '@react-three/fiber'
import { AIWorld } from '../../../../../../src/components/3d/OrbitingWorlds'

interface LandingViewProps {
  token: string | null;
  setAuthModalMode: (mode: 'signin' | 'signup' | 'forgot') => void;
  setAuthModalOpen: (open: boolean) => void;
  switchView: (view: 'landing' | 'dashboard' | 'careers' | 'changelog' | 'privacy' | 'security' | 'terms') => void;
  handlePurchase: (plan: string) => void;
  loadingPlan: string | null;
}

export default function LandingView({
  token,
  setAuthModalMode,
  setAuthModalOpen,
  switchView,
  handlePurchase,
  loadingPlan
}: LandingViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start justify-center">
      <div className="col-span-1 md:col-span-2 w-full flex flex-col justify-center text-left">
        <div className="inline-flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-emerald-50/80 border border-emerald-100 mb-4 mr-auto">
          <BrainCircuit className="w-5 h-5 text-emerald-500" />
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Career Intelligence</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 leading-tight mb-4">
          The Professional AI Companion.
          <span className="block text-emerald-600 mt-1 text-2xl md:text-3xl font-semibold font-sans">
            Unrecordable. Untraceable.
          </span>
        </h1>

        <p className="text-gray-600 leading-relaxed text-sm md:text-base mb-6 font-normal">
          Deliver elite performance with silent real-time audio transcription, translation, and instant AI resolution.
          Shyoski uses native hardware protection layers to hide completely from screen recorders, capture software, and streaming tools.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white/40 p-4 rounded-2xl border border-white/40 shadow-sm">
            <Smartphone className="w-6 h-6 text-emerald-500 mb-2" />
            <div className="font-bold text-gray-800 text-xs uppercase mb-1">Stealth Shield</div>
            <div className="text-xs text-gray-500">Enforces secure, native display isolation layers. Stays completely invisible on Mercer Mettl, Proctorio, Zoom, Teams, and Discord screenshots.</div>
          </div>
          <div className="bg-white/40 p-4 rounded-2xl border border-white/40 shadow-sm">
            <Globe className="w-6 h-6 text-cyan-500 mb-2" />
            <div className="font-bold text-gray-800 text-xs uppercase mb-1">Active Tracker</div>
            <div className="text-xs text-gray-500">Only pay for active minutes spent transcribing. The app detects speech silence to optimize and preserve your billing balance automatically.</div>
          </div>
          <div className="bg-white/40 p-4 rounded-2xl border border-white/40 shadow-sm">
            <Lock className="w-6 h-6 text-indigo-500 mb-2" />
            <div className="font-bold text-gray-800 text-xs uppercase mb-1">Device Lock</div>
            <div className="text-xs text-gray-500">Secure hardware binding. Licenses are encrypted locally using native OS storage layers to enforce strict single-user device authorization.</div>
          </div>
        </div>

        {/* Action Group */}
        <div className="flex flex-wrap items-center gap-3 justify-start pt-2">
          {token ? (
            <button
              onClick={() => switchView('dashboard')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-full font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <User className="w-4 h-4" /> Go to Dashboard
            </button>
          ) : (
            <button
              onClick={() => {
                setAuthModalMode('signin')
                setAuthModalOpen(true)
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-full font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <User className="w-4 h-4" /> Sign In / Sign Up
            </button>
          )}

          <a
            href="https://github.com/Manjunath2133/shysoki/releases/latest/download/Shyoski-1.0.0-arm64.dmg"
            download
          >
            <MagneticButton className="bg-white/80 hover:bg-white border border-gray-200 text-gray-900 px-5 py-3 rounded-full font-semibold text-sm shadow-sm transition-all duration-300">
              Download for macOS
            </MagneticButton>
          </a>
          <a
            href="https://github.com/Manjunath2133/shysoki/releases/latest/download/Shyoski.Setup.1.0.0.exe"
            download
          >
            <MagneticButton className="bg-white/80 hover:bg-white border border-gray-200 text-gray-900 px-5 py-3 rounded-full font-semibold text-sm shadow-sm transition-all duration-300">
              Download for Windows
            </MagneticButton>
          </a>

          <button
            onClick={() => {
              window.history.pushState(null, '', '/')
              window.dispatchEvent(new PopStateEvent('popstate'))
            }}
            className="text-sm text-gray-700 px-4 py-3 rounded-full bg-white/50 border border-white/30 hover:bg-white/80 cursor-pointer"
          >
            Return to Core
          </button>
        </div>

        {/* Pricing Section */}
        <div id="pricing" className="mt-12 text-left">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Choose Your Access Pass</h3>
          <p className="text-xs text-gray-500 mb-6">Secure, high-converting checkout via Razorpay. Upgrade or top-up anytime.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/60 p-5 rounded-2xl border border-white/50 shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-gray-800 text-sm">Hourly Pass</h4>
                <p className="text-[10px] text-gray-400 mt-1">Pay-as-you-go audio resolution time.</p>
                <div className="text-2xl font-extrabold text-emerald-600 my-2">
                  ₹30<span className="text-[10px] text-gray-400 font-medium font-mono"> / 60 mins</span>
                </div>
                <ul className="text-xs text-gray-600 space-y-2 mb-4">
                  <li className="flex items-center gap-1.5">✓ 60 Transcription Minutes</li>
                  <li className="flex items-center gap-1.5">✓ Unlimited AI Queries</li>
                  <li className="flex items-center gap-1.5">✓ Stealth Shield Enabled</li>
                </ul>
              </div>
              <button
                onClick={() => handlePurchase('hourly')}
                disabled={loadingPlan === 'hourly'}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-xl text-xs transition-all cursor-pointer"
              >
                {loadingPlan === 'hourly' ? 'Connecting...' : 'Get Pass'}
              </button>
            </div>

            <div className="bg-white/60 p-5 rounded-2xl border border-white/50 shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-gray-800 text-sm">1 Day Pass</h4>
                <p className="text-[10px] text-gray-400 mt-1">Perfect for temporary high-usage days.</p>
                <div className="text-2xl font-extrabold text-emerald-600 my-2">
                  ₹100<span className="text-[10px] text-gray-400 font-medium font-mono"> / 24 hours</span>
                </div>
                <ul className="text-xs text-gray-600 space-y-2 mb-4">
                  <li className="flex items-center gap-1.5">✓ 24 Hours Unlimited Time</li>
                  <li className="flex items-center gap-1.5">✓ Unlimited AI Queries</li>
                  <li className="flex items-center gap-1.5">✓ Single Device Lock</li>
                </ul>
              </div>
              <button
                onClick={() => handlePurchase('daily')}
                disabled={loadingPlan === 'daily'}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-xl text-xs transition-all cursor-pointer"
              >
                {loadingPlan === 'daily' ? 'Connecting...' : 'Get Pass'}
              </button>
            </div>

            <div className="bg-white/80 p-5 rounded-2xl border border-emerald-300 shadow-md flex flex-col justify-between relative overflow-hidden">
              <span className="absolute top-2 right-2 bg-emerald-100 text-emerald-700 font-extrabold text-[8px] px-2 py-0.5 rounded-full uppercase tracking-wider">Most Popular</span>
              <div>
                <h4 className="font-bold text-gray-800 text-sm">1 Month Pass</h4>
                <p className="text-[10px] text-gray-400 mt-1">Our most popular duration choice.</p>
                <div className="text-2xl font-extrabold text-emerald-600 my-2">
                  ₹3,000<span className="text-[10px] text-gray-400 font-medium font-mono"> / month</span>
                </div>
                <ul className="text-xs text-gray-600 space-y-2 mb-4">
                  <li className="flex items-center gap-1.5">✓ 30 Days Unlimited Time</li>
                  <li className="flex items-center gap-1.5">✓ Priority Resolution Speed</li>
                  <li className="flex items-center gap-1.5">✓ Premium Support Ticket</li>
                </ul>
              </div>
              <button
                onClick={() => handlePurchase('monthly')}
                disabled={loadingPlan === 'monthly'}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-xl text-xs transition-all cursor-pointer"
              >
                {loadingPlan === 'monthly' ? 'Connecting...' : 'Get Pass'}
              </button>
            </div>

            <div className="bg-white/60 p-5 rounded-2xl border border-white/50 shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-gray-800 text-sm">3 Months Pass</h4>
                <p className="text-[10px] text-gray-400 mt-1">Extended productivity support.</p>
                <div className="text-2xl font-extrabold text-emerald-600 my-2">
                  ₹6,000<span className="text-[10px] text-gray-400 font-medium font-mono"> / 3 mos</span>
                </div>
                <ul className="text-xs text-gray-600 space-y-2 mb-4">
                  <li className="flex items-center gap-1.5">✓ 90 Days Unlimited Time</li>
                  <li className="flex items-center gap-1.5">✓ Priority Resolution Speed</li>
                  <li className="flex items-center gap-1.5">✓ Device Binding Transfers</li>
                </ul>
              </div>
              <button
                onClick={() => handlePurchase('3_months')}
                disabled={loadingPlan === '3_months'}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-xl text-xs transition-all cursor-pointer"
              >
                {loadingPlan === '3_months' ? 'Connecting...' : 'Get Pass'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column Canvas */}
      <aside className="hidden md:flex flex-col items-center justify-between h-full py-2 text-left">
        <div className="w-full bg-white/30 border border-white/30 rounded-3xl p-4 shadow-glass-sm aspect-square flex items-center justify-center">
          <Canvas gl={{ antialias: true, alpha: true }} dpr={[1, 1.5]} camera={{ position: [0, 0, 4.5], fov: 40 }}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 5, 5]} intensity={0.8} />
            <AIWorld position={[0, 0, 0]} />
          </Canvas>
        </div>

        <div className="mt-8 w-full bg-white/40 border border-white/40 rounded-2xl p-5 shadow-sm text-left flex flex-col gap-2.5 text-xs font-semibold text-gray-600">
          <div className="text-[10px] uppercase tracking-wider text-emerald-800 font-extrabold mb-1">Company Documents</div>
          <button onClick={() => switchView('security')} className="hover:text-emerald-700 flex items-center gap-2 cursor-pointer text-left w-full">
            <Terminal className="w-3.5 h-3.5" /> Security Shield Whitepaper
          </button>
          <button onClick={() => switchView('careers')} className="hover:text-emerald-700 flex items-center gap-2 cursor-pointer text-left w-full">
            <Briefcase className="w-3.5 h-3.5" /> Careers & Job Openings
          </button>
          <button onClick={() => switchView('changelog')} className="hover:text-emerald-700 flex items-center gap-2 cursor-pointer text-left w-full">
            <RefreshCw className="w-3.5 h-3.5" /> Product Changelog
          </button>
          <button onClick={() => switchView('terms')} className="hover:text-emerald-700 flex items-center gap-2 cursor-pointer text-left w-full">
            <FileText className="w-3.5 h-3.5" /> End User Terms of Service
          </button>
          <button onClick={() => switchView('privacy')} className="hover:text-emerald-700 flex items-center gap-2 cursor-pointer text-left w-full">
            <Lock className="w-3.5 h-3.5" /> Privacy Shield Promise
          </button>
        </div>
      </aside>
    </div>
  )
}
