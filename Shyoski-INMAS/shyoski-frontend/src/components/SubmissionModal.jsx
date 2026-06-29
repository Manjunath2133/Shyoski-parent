import { useState } from 'react';
import { X, Link2, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';


export default function SubmissionModal({ week, onClose, onRefresh }) {
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuth();

  // Assignment Details (Hardcoded for now, could be in DB)
  const assignments = {
    1: {
      title: "Week 1: Frontend Architecture",
      desc: "Build a responsive landing page using React & Tailwind. It must include a Hero section and a Feature grid.",
      requirements: ["React + Vite", "Tailwind CSS", "Responsive Mobile View"]
    },
    2: {
      title: "Week 2: API Integration",
      desc: "Connect your frontend to a public API (or our backend). Fetch data and display it in a grid layout.",
      requirements: ["Fetch / Axios", "Error Handling", "Loading States"]
    }
  };

  const currentTask = assignments[week] || assignments[1];

  async function handleSubmit(e) {
    e.preventDefault();
    if (!link) return;

    try {
      setLoading(true);
      const { API_URL } = await import('../api');
      const res = await fetch(`${API_URL}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: currentUser.uid,
          weekNumber: week,
          link: link,
          type: 'individual'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Success!
      alert("Assignment submitted successfully!");
      onRefresh(); // Reload Dashboard data
      onClose();   // Close Modal

    } catch (err) {
      alert("Error submitting: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/90 rounded-3xl w-full max-w-lg shadow-2xl border border-white/60 backdrop-blur-md">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-950">{currentTask.title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1 hover:bg-gray-100 rounded-xl transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm leading-relaxed">
            {currentTask.desc}
          </div>
          
          <div>
            <h4 className="font-bold text-gray-600 mb-2 text-xs uppercase tracking-wider">Requirements:</h4>
            <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
              {currentTask.requirements.map((req, i) => (
                <li key={i}>{req}</li>
              ))}
            </ul>
          </div>

          <form onSubmit={handleSubmit} className="mt-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              GitHub Repository URL
            </label>
            <div className="relative">
              <Link2 className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
              <input 
                type="url" required
                placeholder="https://github.com/username/project"
                className="w-full pl-10 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none bg-white/80"
                value={link}
                onChange={(e) => setLink(e.target.value)}
              />
            </div>
            
            <button 
              disabled={loading}
              className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all flex justify-center items-center shadow-md disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : "Submit Assignment"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}