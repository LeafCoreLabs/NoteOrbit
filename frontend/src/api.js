// frontend/src/api.js

import axios from 'axios';

const BACKEND_BASE_URL = "http://127.0.0.1:5000"; 
let currentToken = localStorage.getItem("noteorbit_token");

// --- AXIOS CONFIGURATION ---
const api = axios.create({
    baseURL: BACKEND_BASE_URL,
});

api.interceptors.request.use(config => {
    const token = localStorage.getItem("noteorbit_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    } else {
        delete config.headers.Authorization;
    }
    return config;
}, error => {
    return Promise.reject(error);
});
// --- END AXIOS CONFIGURATION ---

const setAuthToken = (token) => {
    currentToken = token; // Keep track locally (though not strictly necessary for this setup)
    if (token) {
        localStorage.setItem("noteorbit_token", token);
    } else {
        localStorage.removeItem("noteorbit_token");
    }
};

export { api, setAuthToken, currentToken };