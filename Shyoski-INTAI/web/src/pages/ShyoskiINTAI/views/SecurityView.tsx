import { ArrowLeft } from 'lucide-react'

interface SecurityViewProps {
  switchView: (view: 'landing' | 'dashboard' | 'careers' | 'changelog' | 'privacy' | 'security' | 'terms') => void;
}

export default function SecurityView({ switchView }: SecurityViewProps) {
  return (
    <div className="w-full text-left max-w-3xl mx-auto">
      <div className="flex items-center justify-between border-b border-gray-200/30 pb-4 mb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900">Display Protection & Privacy Policy</h2>
          <p className="text-xs text-gray-400 mt-1">A technical whitepaper explaining the shielding mechanisms, data collection boundaries, and local encryption models built into Shyoski.</p>
        </div>
        <button
          onClick={() => switchView('landing')}
          className="text-xs font-semibold px-4 py-2 bg-white border border-gray-200 rounded-full hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return
        </button>
      </div>

      <article className="text-sm text-gray-600 space-y-5 leading-relaxed pr-2 max-h-[60vh] overflow-y-auto">
        <div>
          <h3 className="font-bold text-gray-955 text-base mb-1">1. Display Capture Exclusion Policy</h3>
          <p>Shyoski prevents any operating system-level recording or snapshotting of its visual workspace. We implement native operating system and GPU-level display isolation flags to protect the application window context:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1.5">
            <li><strong>macOS Display Shield:</strong> We enforce hardware-level window exclusions that isolate the visual frame directly within the Apple Quartz Window Server framework, preventing screen recorders from obtaining the frame buffer.</li>
            <li><strong>Windows Display Shield:</strong> On Windows, we trigger secure Desktop Window Manager (DWM) policies to exclude the application window overlay from desktop capture pipelines.</li>
          </ul>
          <p className="mt-2"><strong>Result:</strong> Any proctoring browser extension, screen sharing tool (Zoom, Teams, Discord), or background recording utility (OBS, Loom) will record a blank, transparent window instead of our overlay interface, keeping your workspace private.</p>
        </div>

        <div>
          <h3 className="font-bold text-gray-955 text-base mb-1">2. Audio Data and Stream Isolation</h3>
          <p>Our transcription engines work completely locally on your hardware. We capture microphone loops and loopback devices using isolated thread pipes:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1.5">
            <li>Audio bytes are kept in volatile heap buffers for a maximum of 400 milliseconds to translate or match voice prints.</li>
            <li><strong>No Local Storage:</strong> Shyoski never commits audio recordings, transcription databases, or session voice records to the local filesystem.</li>
            <li>When the listening toggle is turned off, all memory pools allocated to stream audio are wiped immediately.</li>
          </ul>
        </div>

        <div>
          <h3 className="font-bold text-gray-955 text-base mb-1">3. Local Cryptographic Cache</h3>
          <p>To support validation integrity and secure license persistence, the application caches an encrypted session token locally.
             We leverage secure platform credential layers to seal and isolate the cached contents:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1.5">
            <li><strong>macOS Protection:</strong> Security keys are isolated using the system's native hardware credential storage framework.</li>
            <li><strong>Windows Protection:</strong> Encryption is sealed using native cryptographic validation interfaces bound strictly to the active system user account context.</li>
          </ul>
        </div>

        <div>
          <h3 className="font-bold text-gray-955 text-base mb-1">4. Concurrency & Anti-Tampering Checks</h3>
          <p>To prevent unauthorized license duplication, the licensing service validates encrypted hardware signature tags. If a system clock anomaly or sync tampering attempt is registered, the interface restricts unauthorized app execution immediately until verified by the server.</p>
        </div>
      </article>
    </div>
  )
}
