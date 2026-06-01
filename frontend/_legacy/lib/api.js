import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

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

export const auth = {
  register: (payload) => api.post("/auth/register", payload),
  login: (payload) => api.post("/auth/login", payload),
  me: () => api.get("/auth/me"),
  updateCfHandle: (cfHandle) =>
    api.put("/auth/cf-handle", { cf_handle: cfHandle }),
  syncCf: () => api.post("/auth/sync-cf"),
};

export const practice = {
  div2: (userId) =>
    api.get("/practice/div2", {
      params: userId ? { user_id: userId } : {},
    }),
  div3: (userId) =>
    api.get("/practice/div3", {
      params: userId ? { user_id: userId } : {},
    }),
  generate: ({ rating = 1200, count = 60, tags = [], userId = null } = {}) =>
    api.get("/practice/generate", {
      params: {
        rating,
        count,
        tags: Array.isArray(tags) ? tags.join(",") : tags,
        ...(userId ? { user_id: userId } : {}),
      },
    }),
  user: (userId) => api.get(`/practice/user/${userId}`),
};

export const duel = {
  create: (payload) => api.post("/duel/create", payload),
  join: (payload) => api.post("/duel/join", payload),
  start: (payload) => api.post("/duel/start", payload),
  get: (duelId) => api.get(`/duel/${duelId}`),
  findByHost: (hostId) => api.get(`/duel/host/${hostId}`),
  getProblem: (duelId, userId) =>
    api.get(`/duel/${duelId}/problem`, { params: { user_id: userId } }),
  submit: (payload) => api.post("/duel/submit", payload),
};

export const submissions = {
  submit: (payload) => api.post("/submissions/submit", payload),
};

export default api;