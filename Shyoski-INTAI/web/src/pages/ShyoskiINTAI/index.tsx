import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAIAuth, API_URL } from './context/AIAuthContext'
import { UniverseCanvas } from '../../../../../src/components/3d/UniverseCanvas'

// Sub-components & Views
import AIAuthModal from './components/AIAuthModal'
import LandingView from './views/LandingView'
import DashboardView from './views/DashboardView'
import CareersView from './views/CareersView'
import ChangelogView from './views/ChangelogView'
import PrivacyView from './views/PrivacyView'
import SecurityView from './views/SecurityView'
import TermsView from './views/TermsView'

export default function ShyoskiAIContent() {
  const { token, email, logout, setAuthModalOpen, setAuthModalMode, license, syncLicense, purchasePlan, toast } = useAIAuth()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [view, setView] = useState<'landing' | 'dashboard' | 'careers' | 'changelog' | 'privacy' | 'security' | 'terms'>('landing')

  // Careers form state
  const [applyingJob, setApplyingJob] = useState<string | null>(null)
  const [applicantName, setApplicantName] = useState('')
  const [applicantEmail, setApplicantEmail] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [resumeUrl, setResumeUrl] = useState('')
  const [coverLetter, setCoverLetter] = useState('')
  const [submittingApp, setSubmittingApp] = useState(false)
  const [appError, setAppError] = useState('')

  const scrollProgressRef = useRef(0)
  const mousePosRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    // Dynamic Razorpay & Google Identity SDK Loader
    const rzpScript = document.createElement('script')
    rzpScript.src = 'https://checkout.razorpay.com/v1/checkout.js'
    rzpScript.async = true
    document.body.appendChild(rzpScript)

    const gScript = document.createElement('script')
    gScript.src = 'https://accounts.google.com/gsi/client'
    gScript.async = true
    gScript.defer = true
    document.body.appendChild(gScript)

    return () => {
      document.body.removeChild(rzpScript)
      document.body.removeChild(gScript)
    }
  }, [])

  const handlePurchase = (plan: string) => {
    purchasePlan(plan, (loading) => {
      setLoadingPlan(loading ? plan : null)
    })
  }

  const handleApplyClick = (jobTitle: string) => {
    setApplyingJob(jobTitle)
    setAppError('')
    setApplicantName('')
    setApplicantEmail('')
    setGithubUrl('')
    setResumeUrl('')
    setCoverLetter('')
  }

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAppError('')
    setSubmittingApp(true)

    try {
      const res = await fetch(`${API_URL}/api/careers/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: applyingJob,
          name: applicantName,
          email: applicantEmail,
          githubUrl,
          resumeUrl,
          coverLetter
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit application.')
      }

      setApplyingJob(null)
      alert('Application submitted successfully!')
    } catch (err: any) {
      setAppError(err.message)
    } finally {
      setSubmittingApp(false)
    }
  }

  const switchView = (newView: typeof view) => {
    setView(newView)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div id="shyoskiai-root" tabIndex={-1} className="relative min-h-screen w-full bg-gradient-to-b from-emerald-50 to-white flex flex-col items-center justify-center p-4 md:p-8 font-sans overflow-auto">
      {/* 3D background canvas (subtle, pointer-events-none) */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <UniverseCanvas scrollProgressRef={scrollProgressRef} mousePosRef={mousePosRef} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-7xl w-full bg-glass/80 border border-white/20 rounded-3xl shadow-glass backdrop-blur-md overflow-hidden flex flex-col mx-auto"
        >
          {/* ============================================================
              GLOBAL BRAND HEADER (WITH LOGO ON EVERY VIEW)
              ============================================================ */}
          <header className="w-full bg-white/40 border-b border-gray-200/30 px-6 py-4 flex flex-wrap justify-between items-center gap-4">
            <div
              onClick={() => {
                window.history.pushState(null, '', '/')
                window.dispatchEvent(new PopStateEvent('popstate'))
              }}
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <img src="/logo.png" alt="Shyoski Logo" className="h-8 w-auto" />
              <span className="text-lg font-bold tracking-tight text-gray-900 font-sans">
                SHYOSKI INTAI
              </span>
            </div>
            
            <nav className="flex flex-wrap items-center gap-4 text-xs font-semibold text-gray-600">
              <button onClick={() => switchView('landing')} className={`hover:text-emerald-700 transition-colors ${view === 'landing' ? 'text-emerald-600 font-bold' : ''}`}>Home</button>
              <button onClick={() => switchView('careers')} className={`hover:text-emerald-700 transition-colors ${view === 'careers' ? 'text-emerald-600 font-bold' : ''}`}>Careers</button>
              <button onClick={() => switchView('changelog')} className={`hover:text-emerald-700 transition-colors ${view === 'changelog' ? 'text-emerald-600 font-bold' : ''}`}>Changelog</button>
              <button onClick={() => switchView('security')} className={`hover:text-emerald-700 transition-colors ${view === 'security' ? 'text-emerald-600 font-bold' : ''}`}>Security Shield</button>
              <button onClick={() => switchView('terms')} className={`hover:text-emerald-700 transition-colors ${view === 'terms' ? 'text-emerald-600 font-bold' : ''}`}>Terms</button>
              <button onClick={() => switchView('privacy')} className={`hover:text-emerald-700 transition-colors ${view === 'privacy' ? 'text-emerald-600 font-bold' : ''}`}>Privacy</button>
              {token && (
                <button onClick={() => switchView('dashboard')} className={`hover:text-emerald-700 transition-colors ${view === 'dashboard' ? 'text-emerald-600 font-bold' : ''}`}>Dashboard</button>
              )}
            </nav>
          </header>

          <div className="p-6 md:p-10">
            {/* LANDING VIEW */}
            {view === 'landing' && (
              <LandingView
                token={token}
                setAuthModalMode={setAuthModalMode}
                setAuthModalOpen={setAuthModalOpen}
                switchView={switchView}
                handlePurchase={handlePurchase}
                loadingPlan={loadingPlan}
              />
            )}

            {/* DASHBOARD VIEW */}
            {view === 'dashboard' && (
              <DashboardView
                email={email}
                token={token}
                license={license}
                syncLicense={syncLicense}
                handlePurchase={handlePurchase}
                loadingPlan={loadingPlan}
                switchView={switchView}
                logout={logout}
              />
            )}

            {/* CAREERS VIEW */}
            {view === 'careers' && (
              <CareersView
                switchView={switchView}
                applyingJob={applyingJob}
                setApplyingJob={setApplyingJob}
                applicantName={applicantName}
                setApplicantName={setApplicantName}
                applicantEmail={applicantEmail}
                setApplicantEmail={setApplicantEmail}
                githubUrl={githubUrl}
                setGithubUrl={setGithubUrl}
                resumeUrl={resumeUrl}
                setResumeUrl={setResumeUrl}
                coverLetter={coverLetter}
                setCoverLetter={setCoverLetter}
                submittingApp={submittingApp}
                appError={appError}
                handleApplyClick={handleApplyClick}
                handleApplySubmit={handleApplySubmit}
              />
            )}

            {/* CHANGELOG VIEW */}
            {view === 'changelog' && (
              <ChangelogView switchView={switchView} />
            )}

            {/* PRIVACY VIEW */}
            {view === 'privacy' && (
              <PrivacyView switchView={switchView} />
            )}

            {/* SECURITY VIEW */}
            {view === 'security' && (
              <SecurityView switchView={switchView} />
            )}

            {/* TERMS VIEW */}
            {view === 'terms' && (
              <TermsView switchView={switchView} />
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Global floating toast notification */}
      {toast.show && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: toast.color || '#3b82f6',
            color: '#ffffff',
            padding: '0.75rem 1.5rem',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            zIndex: 9999,
            fontWeight: '600',
            fontSize: '0.875rem'
          }}
        >
          {toast.message}
        </div>
      )}

      {/* Active Modal */}
      <AIAuthModal />
    </div>
  )
}
