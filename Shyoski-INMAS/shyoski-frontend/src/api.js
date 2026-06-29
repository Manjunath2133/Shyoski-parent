import { auth } from "./lib/firebase";

export const API_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:8787"
  : "https://shyoski-backend.shyoski.workers.dev";

// Dynamic token injection helper
export async function authenticatedFetch(path, options = {}) {
  const url = path.startsWith("http") ? path : `${API_URL}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // Get current logged in user from firebase
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      let token = await currentUser.getIdToken();
      const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      if (isLocalhost && (currentUser.email === "testadmin@example.com" || currentUser.email === "m1@gmail.com" || currentUser.email === "manjusuper@gmail.com")) {
        token = "super_admin_token";
      }
      headers["Authorization"] = `Bearer ${token}`;
    } catch (e) {
      console.error("Failed to fetch Firebase ID token:", e);
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errMsg = `Request failed with status ${response.status}`;
    try {
      const data = await response.json();
      if (data.error && typeof data.error === 'object') {
        errMsg = data.error.message || data.error.code || errMsg;
      } else {
        errMsg = data.error || data.message || errMsg;
      }
    } catch {
      // Body is not JSON
    }
    throw new Error(errMsg);
  }

  return response.json();
}

// 1. REGISTER USER
export async function registerUser(userData) {
  const res = await fetch(`${API_URL}/user`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData),
  });
  
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Failed to register user");
  }
  return res.json();
}

// 2. GET USER PROFILE
export async function getUserProfile(uid) {
  const res = await fetch(`${API_URL}/user/${uid}`);
  if (!res.ok) throw new Error("Failed to fetch profile");
  return res.json();
}

// 3. SUBMIT ASSIGNMENT
export async function submitAssignment(data) {
  const res = await fetch(`${API_URL}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Submission failed");
  }
  return res.json();
}