import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, AlertCircle, LogIn } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError("");
      setLoading(true);
      
      // Firebase Login
      await login(email, password);
      
      // Success -> Go to Dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError("Failed to sign in. Check your email and password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center bg-transparent py-10 px-4">
      <div className="max-w-md w-full bg-white/60 p-8 rounded-3xl shadow-glass border border-white/60 backdrop-blur-md text-left">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 text-blue-600 mb-4 border border-blue-100">
            <LogIn className="w-5 h-5" />
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-950">Welcome Back</h2>
          <p className="text-gray-500 text-xs mt-2">Sign in to continue your internship.</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-650 border border-red-100 p-3.5 rounded-xl mb-6 flex items-center text-xs font-semibold">
            <AlertCircle className="w-4 h-4 mr-2 shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">Email Address</label>
            <input 
              type="email" required
              className="w-full bg-white/50 border border-gray-250 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl p-3 text-sm outline-none transition-all text-gray-900"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">Password</label>
            <input 
              type="password" required
              className="w-full bg-white/50 border border-gray-250 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl p-3 text-sm outline-none transition-all text-gray-900"
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl text-sm shadow-md transition-all flex justify-center items-center disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Sign In"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-500 font-semibold">
          Don't have an account?{' '}
          <Link to="/signup" className="text-blue-600 font-bold hover:underline">
            Apply Now
          </Link>
        </div>
      </div>
    </div>
  );
}