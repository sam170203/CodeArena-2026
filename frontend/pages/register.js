import { useState } from "react";
import { useRouter } from "next/router";
import { auth } from "../lib/api";

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

  return (
    <div style={{ maxWidth: 420, margin: "60px auto", padding: 20 }}>
      <h1 style={{ marginBottom: 20 }}>Register</h1>

      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Username"
        style={{ width: "100%", marginBottom: 10, padding: 10 }}
      />

      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        style={{ width: "100%", marginBottom: 10, padding: 10 }}
      />

      <input
        value={cfHandle}
        onChange={(e) => setCfHandle(e.target.value)}
        placeholder="Codeforces Handle (optional)"
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
        onClick={handleRegister}
        disabled={loading}
        style={{ width: "100%", padding: 10 }}
      >
        {loading ? "Creating account..." : "Register"}
      </button>

      {error && <p style={{ color: "tomato", marginTop: 12 }}>{error}</p>}
    </div>
  );
}