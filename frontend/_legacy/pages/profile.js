import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import useAuthStore from "../store/authStore";
import useToastStore from "../store/toastStore";
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

const inputStyle = {
  width: "100%",
  padding: 12,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.05)",
  color: "white",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

export default function ProfilePage() {
  const router = useRouter();
  const { token, user, fetchMe, hydrate } = useAuthStore();
  const addToast = useToastStore((s) => s.addToast);
  const [cfHandle, setCfHandle] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);

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

    try {
      await auth.updateCfHandle(cfHandle);
      await auth.syncCf();
      await fetchMe();
      addToast("Codeforces handle synced successfully", "success");
    } catch (err) {
      console.error(err);
      addToast(formatApiError(err), "error");
    } finally {
      setLoading(false);
    }
  };

  const syncOnly = async () => {
    setSyncLoading(true);
    try {
      await auth.syncCf();
      await fetchMe();
      addToast("Codeforces data refreshed", "success");
    } catch (err) {
      addToast(formatApiError(err), "error");
    } finally {
      setSyncLoading(false);
    }
  };

  const rankColors = {
    newbie: "#808080",
    pupil: "#008000",
    specialist: "#03a89e",
    expert: "#0000ff",
    "candidate master": "#a0a",
    master: "#ff8c00",
    "international master": "#ff8c00",
    grandmaster: "#e00",
    "international grandmaster": "#e00",
    "legendary grandmaster": "#e00",
  };

  const rankColor = rankColors[user?.cf_rank?.toLowerCase()] || "rgba(255,255,255,0.6)";

  return (
    <div style={{ maxWidth: 720, margin: "60px auto", padding: 20 }}>
      <div style={{
        padding: 32,
        borderRadius: 22,
        background: "rgba(15, 15, 20, 0.72)",
        border: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(22px)",
        marginBottom: 20,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, marginBottom: 4, fontSize: 28 }}>{user?.username || "Profile"}</h1>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.45)", fontSize: 13 }}>
              {user?.email || ""}
            </p>
          </div>
          {user?.cf_rating && (
            <div style={{
              padding: "10px 20px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: rankColor }}>{user.cf_rating}</div>
              <div style={{ fontSize: 12, color: rankColor, opacity: 0.8, textTransform: "capitalize" }}>
                {user.cf_rank || "unrated"}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{
        padding: 32,
        borderRadius: 22,
        background: "rgba(15, 15, 20, 0.72)",
        border: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(22px)",
        marginBottom: 20,
      }}>
        <h2 style={{ margin: 0, marginBottom: 20, fontSize: 18 }}>Account</h2>
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.03)" }}>
            <span style={{ color: "rgba(255,255,255,0.45)" }}>Email</span>
            <span>{user?.email || "—"}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.03)" }}>
            <span style={{ color: "rgba(255,255,255,0.45)" }}>Solved problems</span>
            <span>{user?.solved_count ?? 0}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.03)" }}>
            <span style={{ color: "rgba(255,255,255,0.45)" }}>Duel record</span>
            <span>{user?.duel_wins ?? 0}W / {user?.duel_losses ?? 0}L</span>
          </div>
        </div>
      </div>

      <div style={{
        padding: 32,
        borderRadius: 22,
        background: "rgba(15, 15, 20, 0.72)",
        border: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(22px)",
      }}>
        <h2 style={{ margin: 0, marginBottom: 6, fontSize: 18 }}>Codeforces</h2>
        <p style={{ margin: 0, marginBottom: 20, color: "rgba(255,255,255,0.45)", fontSize: 13 }}>
          Link your Codeforces handle to sync your rating and solved problems
        </p>

        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={cfHandle}
            onChange={(e) => setCfHandle(e.target.value)}
            placeholder="Enter your Codeforces handle"
            style={{ ...inputStyle, flex: 1, minWidth: 200 }}
          />
          <button
            onClick={updateHandle}
            disabled={loading}
            style={{
              padding: "12px 20px",
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              color: "white",
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              whiteSpace: "nowrap",
            }}
          >
            {loading ? "Saving..." : "Save & Sync"}
          </button>
          <button
            onClick={syncOnly}
            disabled={syncLoading || !user?.cf_handle}
            style={{
              padding: "12px 20px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.06)",
              color: "white",
              fontSize: 14,
              fontWeight: 500,
              cursor: syncLoading ? "not-allowed" : "pointer",
              opacity: syncLoading || !user?.cf_handle ? 0.5 : 1,
              whiteSpace: "nowrap",
            }}
          >
            {syncLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {user?.cf_handle && (
          <div style={{ marginTop: 16, display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div style={{ padding: "8px 14px", borderRadius: 10, background: "rgba(255,255,255,0.04)" }}>
              <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>Handle</span>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{user.cf_handle}</div>
            </div>
            <div style={{ padding: "8px 14px", borderRadius: 10, background: "rgba(255,255,255,0.04)" }}>
              <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>Rating</span>
              <div style={{ fontWeight: 600, fontSize: 14, color: rankColor }}>{user.cf_rating ?? "—"}</div>
            </div>
            <div style={{ padding: "8px 14px", borderRadius: 10, background: "rgba(255,255,255,0.04)" }}>
              <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>Rank</span>
              <div style={{ fontWeight: 600, fontSize: 14, color: rankColor, textTransform: "capitalize" }}>{user.cf_rank || "unrated"}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}