import { useState } from "react";
import { useRouter } from "next/router";
import { auth } from "../lib/api";

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

export default function RegisterPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [cfHandle, setCfHandle] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async () => {
    setLoading(true);
    setError("");

    try {
      await auth.register({
        username,
        email,
        password,
        cf_handle: cfHandle || null,
      });

      router.push("/login");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleRegister();
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
        <h1 style={{ margin: 0, marginBottom: 6, fontSize: 28 }}>Create account</h1>
        <p style={{ margin: 0, marginBottom: 28, color: "rgba(255,255,255,0.55)", fontSize: 14 }}>
          Join CodeArena and start dueling
        </p>

        <div style={{ display: "grid", gap: 14 }}>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Username"
            style={inputStyle}
          />

          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Email"
            type="email"
            style={inputStyle}
          />

          <input
            value={cfHandle}
            onChange={(e) => setCfHandle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Codeforces Handle (optional)"
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
            onClick={handleRegister}
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
            {loading ? "Creating account..." : "Create account"}
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