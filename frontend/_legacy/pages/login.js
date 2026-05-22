import { useState } from "react";
import { useRouter } from "next/router";
import useAuthStore from "../store/authStore";
import { auth } from "../lib/api";

function formatApiError(err) {
  const detail = err?.response?.data?.detail;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item) => (typeof item?.msg === "string" ? item.msg : JSON.stringify(item)))
      .join(", ");
  }

  if (detail && typeof detail === "object") {
    return detail.msg || JSON.stringify(detail);
  }

  return err?.message || "Login failed";
}

const inputStyle = {
  width: "100%",
  padding: 12,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.05)",
  color: "white",
  fontSize: 14,
  outline: "none",
  transition: "border-color 0.2s",
  boxSizing: "border-box",
};

export default function LoginPage() {
  const router = useRouter();
  const setToken = useAuthStore((s) => s.setToken);
  const fetchMe = useAuthStore((s) => s.fetchMe);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await auth.login({
        email: identifier,
        username: identifier,
        password,
      });

      const token = res.data?.access_token;
      if (!token) throw new Error("No token received");

      setToken(token);
      await fetchMe();
      router.push("/practice");
    } catch (err) {
      console.error(err);
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{
        padding: 40,
        borderRadius: 22,
        background: "rgba(15, 15, 20, 0.72)",
        border: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(22px)",
        width: "100%",
        maxWidth: 400,
      }}>
        <h1 style={{ margin: 0, marginBottom: 6, fontSize: 28 }}>Welcome back</h1>
        <p style={{ margin: 0, marginBottom: 28, color: "rgba(255,255,255,0.55)", fontSize: 14 }}>
          Sign in to continue to CodeArena
        </p>

        <div style={{ display: "grid", gap: 14 }}>
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Email or Username"
            style={inputStyle}
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Password"
            style={inputStyle}
          />

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              color: "white",
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              transition: "opacity 0.2s",
            }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </div>

        {error && (
          <p style={{
            marginTop: 16, marginBottom: 0,
            color: "#f87171", fontSize: 13,
            padding: "10px 14px", borderRadius: 10,
            background: "rgba(248, 113, 113, 0.1)",
            border: "1px solid rgba(248, 113, 113, 0.2)",
          }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}