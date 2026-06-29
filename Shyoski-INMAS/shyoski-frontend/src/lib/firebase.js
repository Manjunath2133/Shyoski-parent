// shyoski-frontend/src/lib/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// REPLACE THESE VALUES WITH YOUR REAL FIREBASE KEYS
const firebaseConfig = {
  apiKey: "AIzaSyBA1i3bBkESITvfp9K8GIwN_JMFvgHMXWc",
  authDomain: "shyoski-67408.firebaseapp.com",
  projectId: "shyoski-67408",
  storageBucket: "shyoski-67408.firebasestorage.app",
  messagingSenderId: "371605474598",
  appId: "1:371605474598:web:d60e28ee31a767188105e7",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Auth for use in AuthContext
export const auth = getAuth(app);