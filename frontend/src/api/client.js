import axios from "axios";

const BACKEND_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export const api = axios.create({
  baseURL: BACKEND_BASE_URL,
  withCredentials: false,
});

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

export const auth = () => api;
export const unauth = () => api;

export const setAuthToken = (token) => {
  if (token) localStorage.setItem("noteorbit_token", token);
  else localStorage.removeItem("noteorbit_token");
};
