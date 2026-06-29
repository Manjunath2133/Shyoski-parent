import { useEffect, useState } from "react";
import { Briefcase, MapPin, Clock, ExternalLink, Loader2, RotateCw } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function Careers() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchJobs() {
    setLoading(true);
    try {
      const { API_URL } = await import('../api');
      console.log("Fetching jobs from:", `${API_URL}/public/jobs`);
      const res = await fetch(`${API_URL}/public/jobs`);
      console.log("Response status:", res.status);
      const data = await res.json();
      console.log("Jobs data received:", data);
      setJobs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchJobs();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />

      {/* HERO SECTION */}
      <header className="bg-slate-900 text-white pt-20 pb-32 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-blue-600 rounded-full blur-3xl opacity-20"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight leading-tight">
            Join Our <span className="text-blue-400">Team</span>
          </h1>
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
            Explore exciting career opportunities at Shyoski. Grow your skills, build amazing products, and make an impact.
          </p>
        </div>
      </header>

      {/* JOBS SECTION */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900">Open Positions</h2>
            <button
              onClick={fetchJobs}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition disabled:opacity-50"
            >
              <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          
          {loading ? (
            <div className="flex justify-center">
              <Loader2 className="animate-spin text-slate-400 w-8 h-8" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center text-slate-500 bg-slate-50 p-10 rounded-xl shadow-sm">
              <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No open positions at the moment. Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {jobs.map((job) => (
                <div
                  key={job._id}
                  className="bg-white border border-slate-200 rounded-2xl p-8 hover:shadow-lg transition-shadow"
                >
                  {/* Job Title */}
                  <h3 className="text-2xl font-bold text-slate-800 mb-4">{job.title}</h3>

                  {/* Job Details */}
                  <div className="space-y-3 mb-6 text-slate-600">
                    {job.department && (
                      <div className="flex items-center">
                        <Briefcase className="w-5 h-5 mr-3 text-blue-600" />
                        <span>{job.department}</span>
                      </div>
                    )}
                    {job.location && (
                      <div className="flex items-center">
                        <MapPin className="w-5 h-5 mr-3 text-blue-600" />
                        <span>{job.location}</span>
                      </div>
                    )}
                    {job.jobType && (
                      <div className="flex items-center">
                        <Clock className="w-5 h-5 mr-3 text-blue-600" />
                        <span>{job.jobType}</span>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {job.description && (
                    <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                      {job.description.substring(0, 150)}...
                    </p>
                  )}

                  {/* Apply Button */}
                  <a
                    href={job.googleFormLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition"
                  >
                    Apply Now
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
