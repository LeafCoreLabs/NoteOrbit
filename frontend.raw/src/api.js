// api.js - Axios wrapper
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

const client = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
});

export function setAuthToken(token) {
  if (token) {
    client.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete client.defaults.headers.common["Authorization"];
  }
}

export default client;
