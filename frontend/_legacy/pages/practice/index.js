import { useEffect, useMemo, useState } from "react";
import { practice } from "../../lib/api";
import useAuthStore from "../../store/authStore";

const REFRESH_MS = 3 * 60 * 1000;

function parseTags(text) {
  return text
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

function formatProblemId(problem) {
  const contestId = problem.contest_id ?? problem.contestId;
  const index = problem.index;
  if (!contestId || !index) return null;
  return `${contestId}-${index}`;
}

function getProblemLink(problem) {
  const contestId = problem.contest_id ?? problem.contestId;
  const index = problem.index;
  if (!contestId || !index) return "https://codeforces.com";
  return `https://codeforces.com/contest/${contestId}/problem/${index}`;
}

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

  return err?.message || "Failed to load problems";
}

export default function PracticePage() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const user = useAuthStore((s) => s.user);

  const [activeTab, setActiveTab] = useState("div2");
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState("");

  const [customRating, setCustomRating] = useState(1200);
  const [customTagsInput, setCustomTagsInput] = useState("");
  const [appliedCustomRating, setAppliedCustomRating] = useState(1200);
  const [appliedCustomTagsInput, setAppliedCustomTagsInput] = useState("");

  useEffect(() => {
    hydrate();
    fetchMe();
  }, [hydrate, fetchMe]);

  useEffect(() => {
    if (user?.cf_rating) {
      setCustomRating(user.cf_rating);
      setAppliedCustomRating(user.cf_rating);
    }
  }, [user?.cf_rating]);

  const loadProblems = async (tab = activeTab) => {
    try {
      setLoading(true);
      setError("");

      let res;

      if (tab === "div2") {
        res = await practice.div2(user?.id);
      } else if (tab === "div3") {
        res = await practice.div3(user?.id);
      } else if (tab === "personal") {
        if (!user?.id) {
          res = await practice.generate({
            rating: user?.cf_rating || 1200,
            count: 60,
            userId: null,
          });
        } else {
          res = await practice.user(user.id);
        }
      } else {
        res = await practice.generate({
          rating: appliedCustomRating || user?.cf_rating || 1200,
          count: 60,
          tags: parseTags(appliedCustomTagsInput),
          userId: user?.id || null,
        });
      }

      const list = res.data?.problems || [];
      setProblems(list);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error fetching problems:", err);
      setProblems([]);
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProblems(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user?.id, user?.cf_rating, appliedCustomRating, appliedCustomTagsInput]);

  useEffect(() => {
    const id = setInterval(() => {
      loadProblems(activeTab);
    }, REFRESH_MS);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user?.id, user?.cf_rating, appliedCustomRating, appliedCustomTagsInput]);

  const sortedProblems = useMemo(() => {
    return [...problems].sort((a, b) => {
      const activeDiff = Number(Boolean(b.is_active)) - Number(Boolean(a.is_active));
      if (activeDiff !== 0) return activeDiff;

      const statusA = a.status === "solved" ? 1 : 0;
      const statusB = b.status === "solved" ? 1 : 0;
      if (statusA !== statusB) return statusA - statusB;

      const ratingDiff = (a.rating ?? 0) - (b.rating ?? 0);
      if (ratingDiff !== 0) return ratingDiff;

      return (b.contest_id ?? 0) - (a.contest_id ?? 0);
    });
  }, [problems]);

  const customApply = async () => {
    setAppliedCustomRating(Number(customRating) || 1200);
    setAppliedCustomTagsInput(customTagsInput);
    if (activeTab === "custom") {
      await loadProblems("custom");
    }
  };

  const tabBtn = (key, label) => ({
    padding: "10px 16px",
    borderRadius: 999,
    border: activeTab === key ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(255,255,255,0.08)",
    background: activeTab === key ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.05)",
    color: "white",
    cursor: "pointer",
  });

  const cardStyle = (problem) => ({
    padding: 18,
    borderRadius: 18,
    background: problem.status === "solved"
      ? "rgba(0, 255, 120, 0.12)"
      : problem.is_active
        ? "rgba(255,255,255,0.06)"
        : "rgba(255,255,255,0.03)",
    border: problem.status === "solved"
      ? "1px solid rgba(0, 255, 120, 0.6)"
      : "1px solid rgba(255,255,255,0.08)",
    boxShadow: problem.status === "solved"
      ? "0 0 20px rgba(0, 255, 120, 0.18)"
      : "none",
    opacity: problem.is_active ? 1 : 0.72,
    backdropFilter: "blur(18px)",
  });

  return (
    <div style={{ maxWidth: 1180, margin: "40px auto", padding: 20 }}>
      <div
        style={{
          padding: 22,
          borderRadius: 22,
          background: "rgba(15, 15, 20, 0.72)",
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(22px)",
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ marginBottom: 6 }}>Practice</h1>
            <div style={{ opacity: 0.8 }}>
              Div 2, Div 3, personal, and custom sheets with persistent status.
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ opacity: 0.8 }}>Current rating</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{user?.cf_rating ?? 0}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
          <button style={tabBtn("div2", "Div 2")} onClick={() => setActiveTab("div2")}>Div 2</button>
          <button style={tabBtn("div3", "Div 3")} onClick={() => setActiveTab("div3")}>Div 3</button>
          <button style={tabBtn("personal", "Personalized")} onClick={() => setActiveTab("personal")}>Personalized</button>
          <button style={tabBtn("custom", "Custom")} onClick={() => setActiveTab("custom")}>Custom</button>
          <button style={tabBtn("refresh", "Refresh")} onClick={() => loadProblems(activeTab)}>Refresh now</button>
        </div>

        {activeTab === "custom" && (
          <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ opacity: 0.85 }}>Target rating</label>
              <input
                type="number"
                value={customRating}
                onChange={(e) => setCustomRating(e.target.value)}
                style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.05)", color: "white" }}
              />
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ opacity: 0.85 }}>Tags (comma separated)</label>
              <input
                value={customTagsInput}
                onChange={(e) => setCustomTagsInput(e.target.value)}
                placeholder="implementation, greedy, dp"
                style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.05)", color: "white" }}
              />
            </div>

            <div>
              <button
                onClick={customApply}
                style={{
                  padding: "10px 16px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.12)",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Apply custom sheet
              </button>
            </div>
          </div>
        )}

        <div style={{ marginTop: 12, opacity: 0.75 }}>
          {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : "Not loaded yet"}
        </div>

        {error && <div style={{ marginTop: 12, color: "#ff8a8a" }}>{error}</div>}
      </div>

      {loading ? (
        <div style={{ padding: 20 }}>Loading problems...</div>
      ) : sortedProblems.length === 0 ? (
        <div style={{ padding: 20 }}>No problems found.</div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {sortedProblems.map((problem, i) => {
            const problemId = formatProblemId(problem);

            return (
              <div key={`${problemId || "problem"}-${i}`} style={cardStyle(problem)}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span>{problem.name || "Untitled problem"}</span>
                      {problem.status === "solved" && (
                        <span style={{ color: "#8effa8" }}>Solved ✓</span>
                      )}
                      {problem.is_active === false && (
                        <span style={{ opacity: 0.7 }}>Archived</span>
                      )}
                    </div>

                    <div style={{ opacity: 0.82, marginTop: 6 }}>
                      Rating: {problem.rating ?? "N/A"} | Contest: {problem.contest_id ?? "N/A"}
                      {problem.index ? ` | ${problem.index}` : ""}
                    </div>

                    {problem.tags?.length > 0 && (
                      <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {problem.tags.map((tag) => (
                          <span
                            key={tag}
                            style={{
                              padding: "4px 10px",
                              borderRadius: 999,
                              background: "rgba(255,255,255,0.06)",
                              border: "1px solid rgba(255,255,255,0.08)",
                              fontSize: 12,
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <a
                      href={getProblemLink(problem)}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: "10px 14px",
                        borderRadius: 999,
                        border: "1px solid rgba(255,255,255,0.12)",
                        textDecoration: "none",
                      }}
                    >
                      Open
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}