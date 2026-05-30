import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000",
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("ca_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Treat a response as "session is dead, log the user out" when:
 *   - 401 (token invalid/expired — backend has always returned this)
 *   - 404 from /auth/me (old backend returned 404 "User not found" when
 *     the JWT was valid but the user_id didn't exist in DB — happens
 *     after the SQLite → Postgres migration when stale tokens point at
 *     vanished users). The current backend returns 401 here, but this
 *     keeps the frontend resilient even against an old backend.
 *   - Any response whose detail mentions "user not found" / "session
 *     expired" / "invalid token" — belt + suspenders against variants.
 */
function isAuthFailure(err: {
  response?: {
    status?: number;
    config?: { url?: string };
    data?: { detail?: string };
  };
}): boolean {
  const status = err.response?.status;
  const url = err.response?.config?.url ?? "";
  const detail = (err.response?.data?.detail ?? "").toString().toLowerCase();

  if (status === 401) return true;
  if (status === 404 && url.includes("/auth/me")) return true;
  if (
    detail.includes("user not found") ||
    detail.includes("session expired") ||
    detail.includes("invalid token")
  ) {
    return true;
  }
  return false;
}

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (isAuthFailure(err) && typeof window !== "undefined") {
      // Wipe stale auth state.
      localStorage.removeItem("ca_token");
      localStorage.removeItem("ca_user");
      // Don't loop if we're already on /login or /register.
      const path = window.location.pathname;
      if (!path.startsWith("/login") && !path.startsWith("/register")) {
        // One-shot flag so parallel failing requests don't redirect repeatedly.
        if (!sessionStorage.getItem("ca_redirecting_to_login")) {
          sessionStorage.setItem("ca_redirecting_to_login", "1");
          setTimeout(
            () => sessionStorage.removeItem("ca_redirecting_to_login"),
            2000
          );
          window.location.href = "/login?reason=session_expired";
        }
      }
    }
    return Promise.reject(err);
  }
);
