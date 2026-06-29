import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getUserProfile } from "../api";
import { Loader2, Save, User, Link2, Phone, FileText } from "lucide-react";

export default function Profile() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    phone: "",
    githubUrl: "",
    bio: ""
  });

  useEffect(() => {
    async function load() {
      if (currentUser?.uid) {
        const data = await getUserProfile(currentUser.uid);
        setFormData({
            displayName: data.displayName || "",
            email: data.email || "",
            phone: data.phone || "",
            githubUrl: data.githubUrl || "",
            bio: data.bio || ""
        });
        setLoading(false);
      }
    }
    load();
  }, [currentUser]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { API_URL } = await import('../api');
      const res = await fetch(`${API_URL}/user/${currentUser.uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if(res.ok) alert("Profile Updated Successfully!");
      else throw new Error("Update failed");
    } catch(err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-20">
        <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <div className="max-w-2xl w-full bg-white/60 p-8 rounded-3xl shadow-glass border border-white/60 backdrop-blur-md text-left">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 text-blue-600 mb-4 border border-blue-100">
            <User className="w-5 h-5" />
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-950">My Profile</h2>
          <p className="text-gray-500 text-xs mt-2">Manage your student registration details.</p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Read Only Email */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">Email Address</label>
            <input 
              type="email" 
              disabled 
              className="w-full bg-gray-100/50 border border-gray-200 rounded-xl p-3 text-sm text-gray-500 cursor-not-allowed"
              value={formData.email}
            />
            <p className="text-[10px] text-gray-400 mt-1">Email cannot be changed.</p>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                required
                className="w-full bg-white/50 border border-gray-250 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl p-3 pl-10 text-sm outline-none transition-all text-gray-900"
                value={formData.displayName}
                onChange={e => setFormData({...formData, displayName: e.target.value})}
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
              <input 
                type="tel"
                className="w-full bg-white/50 border border-gray-250 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl p-3 pl-10 text-sm outline-none transition-all text-gray-900"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                placeholder="+91 99999 99999"
              />
            </div>
          </div>

          {/* GitHub */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">GitHub Profile</label>
            <div className="relative">
              <Link2 className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
              <input 
                type="url"
                className="w-full bg-white/50 border border-gray-250 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl p-3 pl-10 text-sm outline-none transition-all text-gray-900"
                value={formData.githubUrl}
                onChange={e => setFormData({...formData, githubUrl: e.target.value})}
                placeholder="https://github.com/username"
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">Short Bio</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <textarea 
                rows="3"
                className="w-full bg-white/50 border border-gray-250 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl p-3 pl-10 text-sm outline-none transition-all text-gray-900"
                value={formData.bio}
                onChange={e => setFormData({...formData, bio: e.target.value})}
                placeholder="Student at XYZ University..."
              />
            </div>
          </div>

          <button 
            disabled={saving} 
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl text-sm shadow-md transition-all flex justify-center items-center disabled:opacity-50 cursor-pointer"
          >
             {saving ? (
               <Loader2 className="animate-spin w-5 h-5" />
             ) : (
               <>
                 <Save className="w-4 h-4 mr-2" /> Save Changes
               </>
             )}
          </button>
        </form>
      </div>
    </div>
  );
}