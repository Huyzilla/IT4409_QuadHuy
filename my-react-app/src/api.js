import axios from "axios";

// Centralized API client for the React app.
// Automatically attaches JWT access token (if present) to every request.

export const API_BASE_URL = "http://localhost:3000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

let onUnauthorized = null;
let isHandlingUnauthorized = false;

export const setOnUnauthorized = (handler) => {
  onUnauthorized = typeof handler === "function" ? handler : null;
};

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("traffic-access-token");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const hasToken = !!localStorage.getItem("traffic-access-token");
    const requestUrl = String(error?.config?.url || "");
    const isAuthRequest =
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/register") ||
      requestUrl.includes("/auth/google") ||
      requestUrl.includes("/auth/");

    // If token expired/invalid, force logout once and redirect to /login.
    if (status === 401 && hasToken && !isAuthRequest && !isHandlingUnauthorized) {
      isHandlingUnauthorized = true;
      try {
        if (onUnauthorized) onUnauthorized(error);
      } finally {
        // allow future handling after a short tick
        setTimeout(() => {
          isHandlingUnauthorized = false;
        }, 0);
      }
    }

    return Promise.reject(error);
  }
);
