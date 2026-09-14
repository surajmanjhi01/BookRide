// ==================================================
// ALLOWED CORS ORIGINS (Express REST + Socket.IO)
// ==================================================
//
// * Local development: http://localhost:5173 (Vite)
// * Deployed frontend: https://book-ride-amber.vercel.app
//
// A FRONTEND_URL env var (comma-separated list) can add or
// override additional origins. Trailing slashes are stripped so
// origins always compare cleanly.

const fromEnv =
  (process.env.FRONTEND_URL || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);

const allowedOrigins = Array.from(
  new Set([
    "http://localhost:5173",
    "https://book-ride-amber.vercel.app",
    ...fromEnv,
  ])
);

module.exports = { allowedOrigins };