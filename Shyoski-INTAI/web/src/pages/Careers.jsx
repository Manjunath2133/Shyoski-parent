import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Careers() {
  const { apiUrl, showToast } = useAuth();
  
  const [applyingJob, setApplyingJob] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleApplyClick = (jobTitle) => {
    setApplyingJob(jobTitle);
    setErrorMsg('');
    setName('');
    setEmail('');
    setGithubUrl('');
    setResumeUrl('');
    setCoverLetter('');
  };

  const handleClose = () => {
    setApplyingJob(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    try {
      const res = await fetch(`${apiUrl}/api/careers/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: applyingJob,
          name,
          email,
          githubUrl,
          resumeUrl,
          coverLetter
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit application.');
      }

      showToast('Application submitted successfully!', 'var(--success)');
      setApplyingJob(null);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="doc-wrapper" style={{ marginBottom: '2rem', maxWidth: '1000px' }}>
      <div className="doc-header">
        <h1 style={{ color: '#0f172a' }}>Shape the Future of Stealth AI</h1>
        <p>
          We are building the next generation of unrecordable, context-aware translation and productivity utilities.
          Help us push the boundaries of display architectures and machine learning.
        </p>
      </div>

      {/* Values Section */}
      <div className="grid-3" style={{ marginBottom: '4rem' }}>
        <div className="card">
          <h3>Absolute Privacy</h3>
          <p>
            We believe data ownership is a human right. We build security-first systems that run local filters and
            process audio loops transparently.
          </p>
        </div>
        <div className="card">
          <h3>High Autonomy</h3>
          <p>
            We trust our builders. We don't track hours or manage tasks rigidly; we evaluate execution, clean code,
            and speed of delivery.
          </p>
        </div>
        <div className="card">
          <h3>Extreme Craftsmanship</h3>
          <p>
            Every pixel and hotkey response matters. We are obsessed with sub-millisecond audio rendering and
            completely silent overlays.
          </p>
        </div>
      </div>

      <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1.5rem', textAlign: 'center', color: '#0f172a' }}>
        Open Positions
      </h2>
      
      {/* Job Openings Grid */}
      <div className="jobs-grid">
        <div className="job-card">
          <div className="job-info">
            <h3>Senior Electron & Display Systems Engineer</h3>
            <div className="job-meta">
              <span className="job-tag">Engineering</span>
              <span className="job-tag">Full-Time</span>
              <span className="job-tag">Remote</span>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => handleApplyClick('Senior Electron & Display Systems Engineer')}>
            Apply Now
          </button>
        </div>

        <div className="job-card">
          <div className="job-info">
            <h3>AI Systems Research Scientist (Audio & NLP)</h3>
            <div className="job-meta">
              <span className="job-tag">R&D</span>
              <span className="job-tag">Full-Time</span>
              <span className="job-tag">Hybrid (Bengaluru)</span>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => handleApplyClick('AI Systems Research Scientist (Audio & NLP)')}>
            Apply Now
          </button>
        </div>

        <div className="job-card">
          <div className="job-info">
            <h3>Developer Relations & Technical Advocate</h3>
            <div className="job-meta">
              <span className="job-tag">Marketing</span>
              <span className="job-tag">Contract</span>
              <span className="job-tag">Remote</span>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => handleApplyClick('Developer Relations & Technical Advocate')}>
            Apply Now
          </button>
        </div>
      </div>

      {/* Career Application Modal */}
      {applyingJob && (
        <div className="modal-overlay active" style={{ display: 'flex' }}>
          <div className="modal-container" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <button className="modal-close" onClick={handleClose}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <h3 className="modal-title" style={{ fontSize: '1.25rem' }}>Apply for Position</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '1.5rem', fontWeight: 600 }}>
              {applyingJob}
            </p>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="johndoe@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">GitHub Profile URL (Optional)</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://github.com/johndoe"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Resume Link (PDF Link, Google Drive, etc.)</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://drive.google.com/.../resume.pdf"
                  value={resumeUrl}
                  onChange={(e) => setResumeUrl(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Cover Letter / Pitch (Optional)</label>
                <textarea
                  className="form-input"
                  rows="4"
                  placeholder="Tell us why you are a great fit for Shyoski..."
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  style={{ resize: 'vertical', minHeight: '80px', fontFamily: 'inherit' }}
                />
              </div>

              {errorMsg && (
                <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1.25rem', textAlign: 'center' }}>
                  {errorMsg}
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }} disabled={submitting}>
                {submitting ? 'Submitting Application...' : 'Submit Application'}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
