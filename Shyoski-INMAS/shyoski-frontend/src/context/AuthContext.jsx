/* eslint-disable react-refresh/only-export-components */
// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../lib/firebase";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { getUserProfile } from "../api";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Signup Function (Firebase Only)
  function signup(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  // 2. Login Function
  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // 3. Logout Function
  function logout() {
    return signOut(auth);
  }

  // 4. Listen for User Changes & Fetch backend profile
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const profile = await getUserProfile(user.uid);
          setCurrentUser({
            ...user,
            ...profile // Merge role, globalRole, displayName, progress, batchFee, etc.
          });
        } catch (e) {
          console.error("Failed to load user profile details from backend:", e);
          // Fallback to basic firebase user info if profile fetch fails
          setCurrentUser(user);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    logout,
    refreshProfile: async () => {
      if (auth.currentUser) {
        const profile = await getUserProfile(auth.currentUser.uid);
        setCurrentUser(prev => prev ? { ...prev, ...profile } : profile);
      }
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}