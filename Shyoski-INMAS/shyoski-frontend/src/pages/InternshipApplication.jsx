import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Briefcase, ExternalLink, Loader2 } from "lucide-react";

export default function InternshipApplication() {
  const { currentUser } = useAuth();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchBatches();
  }, [currentUser]);

  async function fetchBatches() {
    try {
      const { API_URL } = await import('../api');
      const res = await fetch(`${API_URL}/public/batches`);
      const data = await res.json();
      setBatches(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch batches:", err);
      setError("Failed to load batches");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col font-sans">
      <div className="flex-1 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <span className="inline-block py-1.5 px-3 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-xs font-bold tracking-wider mb-6">
              APPLICATION HUB
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight leading-tight text-gray-955">
              Apply for <span className="text-gradient-ocean">Internship</span>
            </h1>
            <p className="text-base md:text-lg text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Fill out the application form to apply for our internship programs.
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-gradient-to-r from-blue-50/50 to-purple-50/50 border border-blue-100 rounded-2xl p-6 mb-8 text-left shadow-xs">
            <p className="text-xs font-semibold text-blue-700 leading-relaxed">
              <strong>Notice:</strong> After submitting the form, our administrators will review and add your email to the system. You will receive an email confirmation and immediate access to the student dashboard.
            </p>
          </div>

          {/* Available Batches */}
          <div>
            <h2 className="text-2xl font-extrabold text-gray-950 mb-6 text-left">Available Programs</h2>
            
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
              </div>
            ) : error ? (
              <p className="text-red-650 text-center py-8 font-semibold text-xs">{error}</p>
            ) : batches.length === 0 ? (
              <div className="bg-white/40 border border-white/40 p-10 rounded-2xl text-center shadow-xs">
                <Briefcase className="w-12 h-12 mx-auto mb-4 text-gray-400 opacity-55" />
                <p className="text-gray-650 font-semibold text-sm">No internship programs available at the moment. Please check back later.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {batches.map(batch => (
                  <div key={batch._id} className="bg-white/60 border border-white/60 p-6 rounded-2xl shadow-xs hover:shadow-md transition text-left flex flex-col justify-between">
                    <div>
                      {/* Batch Info */}
                      <h3 className="text-xl font-extrabold text-gray-950 mb-2">{batch.title}</h3>
                      <p className="text-xs text-gray-400 font-mono mb-4">{batch.batchCode}</p>
                      
                      {/* Details */}
                      <div className="space-y-3 mb-6 text-xs text-gray-600 font-semibold">
                        <div className="flex items-center">
                          <Briefcase className="w-4 h-4 mr-3 text-blue-650 flex-shrink-0" />
                          <span><strong>Domain:</strong> {batch.domain || "General"}</span>
                        </div>
                        <div className="flex items-center">
                          <Briefcase className="w-4 h-4 mr-3 text-blue-650 flex-shrink-0" />
                          <span><strong>Start Date:</strong> {batch.startDate ? new Date(batch.startDate).toLocaleDateString() : "N/A"}</span>
                        </div>
                        <div className="flex items-center">
                          <Briefcase className="w-4 h-4 mr-3 text-blue-650 flex-shrink-0" />
                          <span><strong>Fee:</strong> {batch.certificateFee > 0 ? `₹${batch.certificateFee}` : "Free"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Apply Button */}
                    <div>
                      <a
                        href={batch.googleFormLink || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition shadow-xs cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5 mr-2" />
                        Apply Now
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
