const AUTH_TOKEN_KEY = "lawconnect-auth-token";
const TOKEN_EXPIRY_KEY = "lawconnect-token-expiry";
const TOKEN_EXPIRY_TIME = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

const getAuthToken = () =>
  typeof window !== "undefined" ? window.localStorage.getItem(AUTH_TOKEN_KEY) : null;

const getTokenExpiry = () => {
  if (typeof window === "undefined") return null;
  const expiry = window.localStorage.getItem(TOKEN_EXPIRY_KEY);
  return expiry ? parseInt(expiry, 10) : null;
};

const isTokenExpired = () => {
  const expiry = getTokenExpiry();
  if (!expiry) return false;
  return Date.now() > expiry;
};

const setAuthToken = (token) => {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    // Set expiration time to 2 hours from now
    const expiryTime = Date.now() + TOKEN_EXPIRY_TIME;
    window.localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
  } else {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    window.localStorage.removeItem(TOKEN_EXPIRY_KEY);
  }
};

/**
 * Central API request function.
 * Uses relative /api path so Vite proxy handles it in dev,
 * and the same path works in production when frontend + backend are co-located.
 */
const apiRequest = async (path, options = {}) => {
  // Check if token has expired
  if (isTokenExpired()) {
    setAuthToken(null);
    window.dispatchEvent(new Event("auth:logout"));
    throw new Error("Session expired. Please login again.");
  }

  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers = {
    ...(!isFormData && { "Content-Type": "application/json" }),
    ...(options.headers || {}),
  };

  if (options.auth) {
    let token = getAuthToken();

    // Check if Clerk is active and retrieve fresh Clerk JWT token
    if (typeof window !== "undefined" && window.Clerk?.session) {
      try {
        const clerkToken = await window.Clerk.session.getToken();
        if (clerkToken) {
          token = clerkToken;
        }
      } catch {
        // Fallback to stored token
      }
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  let response;
  // Get base URL and remove trailing slash if present
  let API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
  // If API_BASE already ends with /api, remove it so we don't duplicate it
  if (API_BASE.endsWith("/api")) {
    API_BASE = API_BASE.slice(0, -4);
  }

  try {
    response = await fetch(`${API_BASE}/api${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error(
      "Unable to reach the backend. Make sure the API server is running.",
    );
  }

  if (response.status === 204) {
    return null;
  }

  // Auto-logout on 401 Unauthorized — token expired or invalid
  if (response.status === 401 && options.auth) {
    setAuthToken(null);
    window.dispatchEvent(new Event("auth:logout"));
    throw new Error("Session expired. Please login again.");
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.message || "Request failed.");
  }

  return payload;
};

export { apiRequest, getAuthToken, setAuthToken, isTokenExpired, getTokenExpiry };
