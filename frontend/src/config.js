// ==================================================
// BACKEND API BASE URL
// ==================================================
//
// Vercel sets VITE_BASE_URL as a build-time env var. When it is
// missing (e.g. the deployed project has not configured it yet)
// we fall back to the deployed Render backend so the deployed
// frontend works out of the box. Local development can override
// it in frontend/.env.
//
// A trailing slash is stripped so URL concatenation is always safe.

const API_BASE_URL = (
  import.meta.env.VITE_BASE_URL || "https://bookride-07of.onrender.com"
).replace(/\/$/, "");

export default API_BASE_URL;