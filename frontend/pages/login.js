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

  return (
    <div style={{ maxWidth: 420, margin: "60px auto", padding: 20 }}>
      <h1 style={{ marginBottom: 20 }}>Login</h1>

      <input
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
        placeholder="Email or Username"
        style={{ width: "100%", marginBottom: 10, padding: 10 }}
      />

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        style={{ width: "100%", marginBottom: 10, padding: 10 }}
      />

      <button
        onClick={handleLogin}
        disabled={loading}
        style={{ width: "100%", padding: 10 }}
      >
        {loading ? "Logging in..." : "Login"}
      </button>

      {error && <p style={{ color: "tomato", marginTop: 12 }}>{error}</p>}
    </div>
  );
}