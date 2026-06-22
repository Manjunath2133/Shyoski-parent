import { ArrowLeft } from 'lucide-react'

interface CareersViewProps {
  switchView: (view: 'landing' | 'dashboard' | 'careers' | 'changelog' | 'privacy' | 'security' | 'terms') => void;
  applyingJob: string | null;
  setApplyingJob: (job: string | null) => void;
  applicantName: string;
  setApplicantName: (name: string) => void;
  applicantEmail: string;
  setApplicantEmail: (email: string) => void;
  githubUrl: string;
  setGithubUrl: (url: string) => void;
  resumeUrl: string;
  setResumeUrl: (url: string) => void;
  coverLetter: string;
  setCoverLetter: (letter: string) => void;
  submittingApp: boolean;
  appError: string;
  handleApplyClick: (jobTitle: string) => void;
  handleApplySubmit: (e: React.FormEvent) => Promise<void> | void;
}

export default function CareersView({
  switchView,
  applyingJob,
  setApplyingJob,
  applicantName,
  setApplicantName,
  applicantEmail,
  setApplicantEmail,
  githubUrl,
  setGithubUrl,
  resumeUrl,
  setResumeUrl,
  coverLetter,
  setCoverLetter,
  submittingApp,
  appError,
  handleApplyClick,
  handleApplySubmit
}: CareersViewProps) {
  return (
    <div className="w-full text-left max-w-4xl mx-auto">
      <div className="flex items-center justify-between border-b border-gray-200/30 pb-4 mb-6">
        <h2 className="text-2xl font-extrabold text-gray-900">Shape the Future of Stealth AI</h2>
        <button
          onClick={() => switchView('landing')}
          className="text-xs font-semibold px-4 py-2 bg-white border border-gray-200 rounded-full hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return
        </button>
      </div>

      <p className="text-sm text-gray-600 leading-relaxed mb-8">
        We are building the next generation of unrecordable, context-aware translation and productivity utilities.
        Help us push the boundaries of display architectures and machine learning.
      </p>

      {/* Values Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white/50 border border-white/40 p-5 rounded-2xl shadow-sm">
          <h3 className="font-extrabold text-sm text-gray-800 mb-2">Absolute Privacy</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            We believe data ownership is a human right. We build security-first systems that run local filters and
            process audio loops transparently.
          </p>
        </div>
        <div className="bg-white/50 border border-white/40 p-5 rounded-2xl shadow-sm">
          <h3 className="font-extrabold text-sm text-gray-800 mb-2">High Autonomy</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            We trust our builders. We don't track hours or manage tasks rigidly; we evaluate execution, clean code,
            and speed of delivery.
          </p>
        </div>
        <div className="bg-white/50 border border-white/40 p-5 rounded-2xl shadow-sm">
          <h3 className="font-extrabold text-sm text-gray-800 mb-2">Extreme Craftsmanship</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            Every pixel and hotkey response matters. We are obsessed with sub-millisecond audio rendering and
            completely silent overlays.
          </p>
        </div>
      </div>

      <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">Open Positions</h3>
      
      {/* Job openings */}
      <div className="space-y-4 mb-8">
        <div className="bg-white/50 border border-white/50 p-5 rounded-2xl flex justify-between items-center flex-wrap gap-4">
          <div>
            <h4 className="font-bold text-sm text-gray-800">Senior Electron & Display Systems Engineer</h4>
            <div className="flex gap-2 text-[10px] text-gray-400 font-semibold mt-1">
              <span>Engineering</span> • <span>Full-Time</span> • <span>Remote</span>
            </div>
          </div>
          <button
            onClick={() => handleApplyClick('Senior Electron & Display Systems Engineer')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
          >
            Apply Now
          </button>
        </div>

        <div className="bg-white/50 border border-white/50 p-5 rounded-2xl flex justify-between items-center flex-wrap gap-4">
          <div>
            <h4 className="font-bold text-sm text-gray-800">AI Systems Research Scientist (Audio & NLP)</h4>
            <div className="flex gap-2 text-[10px] text-gray-400 font-semibold mt-1">
              <span>R&D</span> • <span>Full-Time</span> • <span>Hybrid (Bengaluru)</span>
            </div>
          </div>
          <button
            onClick={() => handleApplyClick('AI Systems Research Scientist (Audio & NLP)')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
          >
            Apply Now
          </button>
        </div>

        <div className="bg-white/50 border border-white/50 p-5 rounded-2xl flex justify-between items-center flex-wrap gap-4">
          <div>
            <h4 className="font-bold text-sm text-gray-800">Developer Relations & Technical Advocate</h4>
            <div className="flex gap-2 text-[10px] text-gray-400 font-semibold mt-1">
              <span>Marketing</span> • <span>Contract</span> • <span>Remote</span>
            </div>
          </div>
          <button
            onClick={() => handleApplyClick('Developer Relations & Technical Advocate')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
          >
            Apply Now
          </button>
        </div>
      </div>

      {/* Application Popup modal */}
      {applyingJob && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-900/40 backdrop-blur-md">
          <div className="bg-white p-6 rounded-3xl max-w-md w-full relative shadow-glass mx-4 text-gray-800 max-h-[90vh] overflow-y-auto text-left">
            <button onClick={() => setApplyingJob(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold">✕</button>
            <h3 className="text-lg font-bold mb-1">Apply for Position</h3>
            <div className="text-xs text-emerald-700 font-semibold mb-4">{applyingJob}</div>

            <form onSubmit={handleApplySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Full Name</label>
                <input
                  type="text"
                  className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-emerald-500 rounded-xl p-3 text-xs outline-none text-gray-900"
                  placeholder="John Doe"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Email Address</label>
                <input
                  type="email"
                  className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-emerald-500 rounded-xl p-3 text-xs outline-none text-gray-900"
                  placeholder="johndoe@example.com"
                  value={applicantEmail}
                  onChange={(e) => setApplicantEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">GitHub Profile URL (Optional)</label>
                <input
                  type="url"
                  className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-emerald-500 rounded-xl p-3 text-xs outline-none text-gray-900"
                  placeholder="https://github.com/johndoe"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Resume Link (PDF Link, Google Drive, etc.)</label>
                <input
                  type="url"
                  className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-emerald-500 rounded-xl p-3 text-xs outline-none text-gray-900"
                  placeholder="https://drive.google.com/.../resume.pdf"
                  value={resumeUrl}
                  onChange={(e) => setResumeUrl(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Cover Letter / Pitch (Optional)</label>
                <textarea
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-emerald-500 rounded-xl p-3 text-xs outline-none resize-y text-gray-900"
                  placeholder="Tell us why you are a great fit for Shyoski..."
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                />
              </div>
              {appError && <div className="text-red-500 text-xs text-center">{appError}</div>}
              <button type="submit" disabled={submittingApp} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center cursor-pointer">
                {submittingApp ? 'Submitting Application...' : 'Submit Application'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
