import { api, setAuthToken } from "./client";

export { setAuthToken };

export const registerUser = (userData) => api.post("/register", userData);
