import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL,
});

// Automatically attach JWT token (rider default).
//
// IMPORTANT:
// Only fill in the Authorization header when the caller did NOT
// already provide one explicitly. CaptainHome.jsx always passes the
// captain's own JWT in the request config
// (`headers: { Authorization: Bearer <captain-token> }`).
// Overwriting it here with the rider token ("user") made every
// captain API call fail with 401 (authCaptain looks up the rider's
// _id in the captains collection and finds no captain), so the
// captain could never go online / store location / receive rides.
api.interceptors.request.use(
  (config) => {
    const explicitAuth = config.headers?.get
      ? config.headers.get("Authorization")
      : config.headers?.Authorization;

    if (!explicitAuth) {
      const token = localStorage.getItem("user");

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    console.log(
      `[axios] ${(config.method || "?").toUpperCase()} ${config.url} → auth: ${
        explicitAuth ? "explicit-header" : localStorage.getItem("user") ? "user-token" : "none"
      }`
    );

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 responses: clear the invalid/expired token and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error(
        "Authentication failed:",
        error.response.data?.message || error.message
      );

      // Clear stale/invalid token
      localStorage.removeItem("user");

      // Redirect to login if not already there
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
