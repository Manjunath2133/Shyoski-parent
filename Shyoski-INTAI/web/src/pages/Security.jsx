import React from 'react';

export default function Security() {
  return (
    <main className="doc-wrapper">
      <div className="doc-header">
        <h1 style={{ color: '#0f172a' }}>Display Protection & Privacy Policy</h1>
        <p>A technical whitepaper explaining the shielding mechanisms, data collection boundaries, and local encryption models built into Shyoski.</p>
      </div>

      <article className="doc-content">
        <h2>1. Display Capture Exclusion Policy</h2>
        <p>Shyoski prevents any operating system-level recording or snapshotting of its visual workspace. We implement native operating system and GPU-level display isolation flags to protect the application window context:</p>
        <ul>
          <li><strong>macOS Display Shield:</strong> We enforce hardware-level window exclusions that isolate the visual frame directly within the Apple Quartz Window Server framework, preventing screen recorders from obtaining the frame buffer.</li>
          <li><strong>Windows Display Shield:</strong> On Windows, we trigger secure Desktop Window Manager (DWM) policies to exclude the application window overlay from desktop capture pipelines.</li>
        </ul>
        <p><strong>Result:</strong> Any proctoring browser extension, screen sharing tool (Zoom, Teams, Discord), or background recording utility (OBS, Loom) will record a blank, transparent window instead of our overlay interface, keeping your workspace private.</p>

        <h2>2. Audio Data and Stream Isolation</h2>
        <p>Our transcription engines work completely locally on your hardware. We capture microphone loops and loopback devices using isolated thread pipes:</p>
        <ul>
          <li>Audio bytes are kept in volatile heap buffers for a maximum of 400 milliseconds to translate or match voice prints.</li>
          <li><strong>No Local Storage:</strong> Shyoski never commits audio recordings, transcription databases, or session voice records to the local filesystem.</li>
          <li>When the listening toggle is turned off, all memory pools allocated to stream audio are wiped immediately.</li>
        </ul>

        <h2>3. Local Cryptographic Cache</h2>
        <p>To support validation integrity and secure license persistence, the application caches an encrypted session token locally.
           We leverage secure platform credential layers to seal and isolate the cached contents:</p>
        <ul>
          <li><strong>macOS Protection:</strong> Security keys are isolated using the system's native hardware credential storage framework.</li>
          <li><strong>Windows Protection:</strong> Encryption is sealed using native cryptographic validation interfaces bound strictly to the active system user account context.</li>
        </ul>

        <h2>4. Concurrency & Anti-Tampering Checks</h2>
        <p>To prevent unauthorized license duplication, the licensing service validates encrypted hardware signature tags. If a system clock anomaly or sync tampering attempt is registered, the interface restricts unauthorized app execution immediately until verified by the server.</p>
      </article>
    </main>
  );
}
