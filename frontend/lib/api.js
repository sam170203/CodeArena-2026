import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// 🔐 Attach JWT token automatically
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

/* =========================
   AUTH APIs
========================= */
export const auth = {
  register: (payload) => api.post("/auth/register", payload),
  login: (payload) => api.post("/auth/login", payload),
  me: () => api.get("/auth/me"),

  // ✅ FIXED: send as BODY (not query param)
  updateCfHandle: (cfHandle) =>
    api.put("/auth/cf-handle", { cf_handle: cfHandle }),

  // ✅ FIXED: backend should use token → no handle needed
  syncCf: () => api.post("/auth/sync-cf"),
};

/* =========================
   PRACTICE APIs
========================= */
export const practice = {
  div2: () => api.get("/practice/div2"),
  div3: () => api.get("/practice/div3"),

  generate: ({ rating = 1200, count = 5, tags = [] } = {}) =>
    api.get("/practice/generate", {
      params: {
        rating,
        count,
        tags: Array.isArray(tags) ? tags.join(",") : tags,
      },
    }),

  user: (userId) => api.get(`/practice/user/${userId}`),
};

/* =========================
   DUEL APIs
========================= */
export const duel = {
  create: (payload) => api.post("/duel/create", payload),
  join: (payload) => api.post("/duel/join", payload),

  // ⚠️ keep params (backend expects query)
  start: (duelId, userId) =>
    api.post("/duel/start", null, {
      params: { duel_id: duelId, user_id: userId },
    }),

  get: (duelId) => api.get(`/duel/${duelId}`),

  getProblem: (duelId, userId) =>
    api.get(`/duel/${duelId}/problem`, {
      params: { user_id: userId },
    }),

  submit: (duelId, userId) =>
    api.post("/duel/submit", null, {
      params: { duel_id: duelId, user_id: userId },
    }),
};

/* =========================
   SUBMISSIONS APIs
========================= */
export const submissions = {
  submit: (payload) => api.post("/submissions/submit", payload),
};

export default api;