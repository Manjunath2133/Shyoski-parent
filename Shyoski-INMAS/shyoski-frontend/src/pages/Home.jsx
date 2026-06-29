import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Calendar, Users, ArrowRight, CheckCircle, Loader2 } from "lucide-react";

export default function Home() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(!!currentUser);

  // Check if user is logged in and redirect if not approved
  useEffect(() => {
    async function checkUserStatus() {
      if (!currentUser?.uid) {
        setCheckingAuth(false);
        return;
      }

      try {
        const { API_URL } = await import('../api');
        const res = await fetch(`${API_URL}/user/${currentUser.uid}`);
        await res.json();

        // All logged-in users (pending, approved, rejected) can see home page
        setCheckingAuth(false);
      } catch (err) {
        console.error("Error checking auth status:", err);
        setCheckingAuth(false);
      }
    }

    checkUserStatus();
  }, [currentUser, navigate]);

  useEffect(() => {
    async function fetchBatches() {
      try {
        const { API_URL } = await import('../api');
        const res = await fetch(`${API_URL}/public/batches`);
        const data = await res.json();
        setBatches(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch batches", err);
      } finally {
        setLoading(false);
      }
    }
    fetchBatches();
  }, []);

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col font-sans">
      <Navbar />

      {/* HERO SECTION */}
      <header className="bg-transparent text-gray-900 pt-10 pb-16 px-6 relative overflow-hidden select-none">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span className="inline-block py-1.5 px-3 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-xs font-bold tracking-wider mb-6">
            NOW HIRING INTERNS FOR 2026
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight leading-tight text-gray-950">
            Build Real Software.<br/>
            <span className="text-gradient-ocean">Get Certified.</span>
          </h1>
          <p className="text-base md:text-lg text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Join the elite internship program that simulates a real enterprise environment. 
            Code, collaborate, and deploy live projects in 4 weeks.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button 
              onClick={() => document.getElementById('batches').scrollIntoView({ behavior: 'smooth' })}
              className="bg-blue-600 text-white px-8 py-3.5 rounded-full font-bold text-sm hover:bg-blue-500 transition shadow-md shadow-blue-500/20 flex items-center cursor-pointer"
            >
              Start Your Journey <ArrowRight className="ml-2 w-4 h-4" />
            </button>
            <button 
              onClick={() => document.getElementById('batches').scrollIntoView({ behavior: 'smooth' })}
              className="bg-white/80 hover:bg-white text-gray-900 border border-gray-200 px-8 py-3.5 rounded-full font-semibold text-sm shadow-sm transition-all duration-300 cursor-pointer"
            >
              View Openings
            </button>
          </div>
        </div>
      </header>

      {/* FEATURES */}
      <section id="about" className="py-12 px-6 bg-transparent">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white/40 rounded-2xl border border-white/40 shadow-sm text-left">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4"><CheckCircle /></div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Weekly Milestones</h3>
            <p className="text-sm text-gray-600 leading-relaxed">Structured locking system. Complete one week's task to unlock the next level.</p>
          </div>
          <div className="p-6 bg-white/40 rounded-2xl border border-white/40 shadow-sm text-left">
            <div className="w-12 h-12 bg-indigo-50/80 text-indigo-600 rounded-xl flex items-center justify-center mb-4"><Users /></div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Team Collaboration</h3>
            <p className="text-sm text-gray-600 leading-relaxed">Week 3 is strictly collaborative. Form squads, video chat, and build together.</p>
          </div>
          <div className="p-6 bg-white/40 rounded-2xl border border-white/40 shadow-sm text-left">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4"><CheckCircle /></div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Verified Certification</h3>
            <p className="text-sm text-gray-600 leading-relaxed">Get a cryptographically signed QR-coded certificate upon successful deployment.</p>
          </div>
        </div>
      </section>

      {/* ACTIVE BATCHES SECTION */}
      <section id="batches" className="py-12 px-6 bg-transparent">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center text-gray-950 mb-12">Upcoming Batches</h2>
          
          {loading ? (
            <div className="flex justify-center"><Loader2 className="animate-spin text-blue-500 w-8 h-8" /></div>
          ) : batches.length === 0 ? (
            <div className="text-center text-gray-500 bg-white/40 border border-white/40 p-10 rounded-2xl shadow-sm">
              No active batches at the moment. Please check back later.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {batches.map((batch) => (
                <div key={batch._id} className="bg-white/60 p-8 rounded-2xl shadow-sm border border-white/60 hover:shadow-md transition-shadow relative overflow-hidden group text-left">
                  <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-extrabold px-3.5 py-1.5 rounded-bl-xl uppercase tracking-wider">
                    OPEN
                  </div>
                  <h3 className="text-xl md:text-2xl font-extrabold text-gray-900 mb-2">{batch.title}</h3>
                  <div className="flex items-center text-gray-500 mb-6 text-xs font-semibold">
                    <Calendar className="w-4 h-4 mr-2" /> Starts {new Date(batch.startDate).toDateString()}
                    <span className="mx-3 text-gray-300">•</span>
                    <span className="font-mono bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-md text-blue-700">{batch.batchCode}</span>
                  </div>
                  
                  <div className="flex justify-between items-center border-t border-gray-150 pt-6">
                    <div>
                        <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">Fee</div>
                        <div className="text-lg font-bold text-gray-900">
                            {batch.certificateFee > 0 ? `₹${batch.certificateFee}` : "Free Scholarship"}
                        </div>
                    </div>
                    <button 
                      onClick={() => {
                        if (batch.googleFormLink) {
                          window.open(batch.googleFormLink, '_blank');
                        } else {
                          alert("Application link coming soon!");
                        }
                      }}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
                    >
                        Apply Now
                    </button>
                  </div>
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