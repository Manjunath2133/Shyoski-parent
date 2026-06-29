import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { registerUser } from "../api";
import { Loader2, ArrowRight, UserPlus, AlertCircle } from "lucide-react";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { signup } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCredential = await signup(email, password);
      const user = userCredential.user;

      await registerUser({
        uid: user.uid,
        email: user.email,
        displayName: name,
        batchId: null,
        internshipStatus: null
      });

      navigate("/internship-application");
    } catch (err) {
      console.error(err);
      setError("Failed to create an account. " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center bg-transparent py-10 px-4">
      <div className="max-w-md w-full bg-white/60 p-8 rounded-3xl shadow-glass border border-white/60 backdrop-blur-md text-left">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 text-blue-600 mb-4 border border-blue-100">
            <UserPlus className="w-5 h-5" />
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-950">Create Account</h2>
          <p className="text-gray-500 text-xs mt-2">Join the elite internship program.</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-650 border border-red-100 p-3.5 rounded-xl mb-6 flex items-center text-xs font-semibold">
            <AlertCircle className="w-4 h-4 mr-2 shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">Full Name</label>
            <input
              type="text"
              required
              className="w-full bg-white/50 border border-gray-250 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl p-3 text-sm outline-none transition-all text-gray-900"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">Email Address</label>
            <input
              type="email"
              required
              className="w-full bg-white/50 border border-gray-250 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl p-3 text-sm outline-none transition-all text-gray-900"
              placeholder="student@college.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">Password</label>
            <input
              type="password"
              required
              className="w-full bg-white/50 border border-gray-250 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl p-3 text-sm outline-none transition-all text-gray-900"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-[10px] text-gray-400 mt-1">Must be at least 6 characters.</p>
          </div>

          <button
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl text-sm shadow-md transition-all flex justify-center items-center disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="animate-spin w-5 h-5" />
            ) : (
              <>
                Sign Up <ArrowRight className="ml-2 w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-500 font-semibold">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-600 font-bold hover:underline">
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
}