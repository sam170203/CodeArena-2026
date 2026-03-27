import { useEffect, useState } from "react";
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

  return err?.message || "Something went wrong";
}

export default function ProfilePage() {
  const router = useRouter();
  const { token, user, fetchMe, hydrate } = useAuthStore();
  const [cfHandle, setCfHandle] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (token === null) return;
    if (!token) {
      router.push("/login");
      return;
    }
    fetchMe();
  }, [token, router, fetchMe]);

  useEffect(() => {
    if (user?.cf_handle) setCfHandle(user.cf_handle);
  }, [user]);

  const updateHandle = async () => {
    setLoading(true);
    setMessage("");

    try {
      await auth.updateCfHandle(cfHandle);
      await auth.syncCf();
      await fetchMe();
      setMessage("CF handle synced successfully.");
    } catch (err) {
      console.error(err);
      setMessage(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "60px auto", padding: 20 }}>
      <h1 style={{ marginBottom: 20 }}>Profile</h1>

      <div style={{ marginBottom: 12 }}><strong>Username:</strong> {user?.username || "Loading..."}</div>
      <div style={{ marginBottom: 12 }}><strong>Email:</strong> {user?.email || "—"}</div>
      <div style={{ marginBottom: 12 }}><strong>Codeforces Handle:</strong> {user?.cf_handle || "—"}</div>
      <div style={{ marginBottom: 12 }}><strong>CF Rating:</strong> {user?.cf_rating ?? 0}</div>
      <div style={{ marginBottom: 12 }}><strong>CF Rank:</strong> {user?.cf_rank || "unrated"}</div>
      <div style={{ marginBottom: 12 }}><strong>Solved Count:</strong> {user?.solved_count ?? 0}</div>

      <div style={{ marginTop: 24 }}>
        <h3>Sync Codeforces</h3>
        <input
          value={cfHandle}
          onChange={(e) => setCfHandle(e.target.value)}
          placeholder="Enter your handle"
          style={{ width: "100%", marginTop: 10, marginBottom: 10, padding: 10 }}
        />
        <button onClick={updateHandle} disabled={loading} style={{ padding: 10 }}>
          {loading ? "Syncing..." : "Save & Sync"}
        </button>
      </div>

      {message && <p style={{ marginTop: 12 }}>{message}</p>}
    </div>
  );
}