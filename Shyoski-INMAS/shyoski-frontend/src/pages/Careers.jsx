import { useEffect, useState } from "react";
import { Briefcase, MapPin, Clock, ExternalLink, Loader2, RotateCw } from "lucide-react";

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
    <div className="flex flex-col font-sans">
      {/* HERO SECTION */}
      <header className="bg-transparent text-gray-950 pt-10 pb-16 px-6 relative overflow-hidden select-none">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span className="inline-block py-1.5 px-3 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-xs font-bold tracking-wider mb-6">
            CAREERS PORTAL
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight leading-tight">
            Join Our <span className="text-gradient-ocean">Team</span>
          </h1>
          <p className="text-base md:text-lg text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Explore exciting career opportunities at Shyoski. Grow your skills, build amazing products, and make an impact.
          </p>
        </div>
      </header>

      {/* JOBS SECTION */}
      <section className="py-12 px-6 bg-transparent">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-950">Open Positions</h2>
            <button
              onClick={fetchJobs}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-650 hover:bg-blue-600 text-white rounded-xl font-bold text-xs transition disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          
          {loading ? (
            <div className="flex justify-center">
              <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center text-gray-550 bg-white/40 border border-white/40 p-10 rounded-2xl shadow-xs">
              <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50 text-gray-400" />
              <p className="text-base font-semibold">No open positions at the moment. Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {jobs.map((job) => (
                <div
                  key={job._id}
                  className="bg-white/60 border border-white/60 rounded-2xl p-8 hover:shadow-md transition-shadow text-left flex flex-col justify-between"
                >
                  <div>
                    {/* Job Title */}
                    <h3 className="text-xl md:text-2xl font-extrabold text-gray-950 mb-4">{job.title}</h3>

                    {/* Job Details */}
                    <div className="space-y-3 mb-6 text-gray-600 text-xs font-semibold">
                      {job.department && (
                        <div className="flex items-center">
                          <Briefcase className="w-4 h-4 mr-3 text-blue-650" />
                          <span>{job.department}</span>
                        </div>
                      )}
                      {job.location && (
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-3 text-blue-650" />
                          <span>{job.location}</span>
                        </div>
                      )}
                      {job.jobType && (
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-3 text-blue-650" />
                          <span>{job.jobType}</span>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    {job.description && (
                      <p className="text-gray-650 text-xs mb-6 leading-relaxed">
                        {job.description.substring(0, 150)}...
                      </p>
                    )}
                  </div>

                  {/* Apply Button */}
                  <div>
                    <a
                      href={job.googleFormLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-500 transition shadow-xs"
                    >
                      Apply Now
                      <ExternalLink className="w-3.5 h-3.5 ml-2" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
