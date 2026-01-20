// src/api.js
import axios from "axios";

// ✅ If using Nginx reverse proxy:
// Vercel ENV: VITE_API_URL = http://13.201.125.88
// Local fallback: http://127.0.0.1:5000
const BACKEND_BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

export const api = axios.create({
  baseURL: BACKEND_BASE_URL,
  withCredentials: false,
});

// ✅ Attach token on every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("noteorbit_token");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Auto logout if token invalid
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("noteorbit_user");
      localStorage.removeItem("noteorbit_token");
    }
    return Promise.reject(err);
  }
);

export const setAuthToken = (token) => {
  if (token) localStorage.setItem("noteorbit_token", token);
  else localStorage.removeItem("noteorbit_token");
};

// ---------------------------
// ✅ AUTH API HELPERS
// ---------------------------
export const sendOtp = async (email, mode = "signup") => {
  return api.post("/auth/send-otp", { email, mode });
};

export const verifyOtp = async (email, otp) => {
  return api.post("/auth/verify-otp", { email, otp });
};

export const resetPassword = async (email, otp, newPassword) => {
  return api.post("/auth/reset-password", {
    email,
    otp,
    new_password: newPassword,
  });
};

export const registerWithOtp = async (userData) => {
  return api.post("/register", userData);
};
