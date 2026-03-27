import { useEffect, useMemo, useState } from 'react';
import { practice } from '../../lib/api';
import useAuthStore from '../../store/authStore';

const REFRESH_MS = 5 * 60 * 1000;

export default function PracticePage() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState('div2');
  const [lastUpdated, setLastUpdated] = useState(null);
  const hydrate = useAuthStore((s) => s.hydrate);
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);

  useEffect(() => {
    hydrate();
    fetchMe();
  }, [hydrate, fetchMe]);

  const load = async (mode = level) => {
    try {
      setLoading(true);
      let res;
      if (mode === 'div2') res = await practice.div2();
      else if (mode === 'div3') res = await practice.div3();
      else if (mode === 'personal') {
        if (user?.id) res = await practice.user(user.id);
        else res = await practice.generate({ rating: 1200, count: 10 });
      } else {
        res = await practice.generate({ rating: 1200, count: 10 });
      }

      const list = (res.data?.problems || []).slice().sort((a, b) => (a.rating ?? 0) - (b.rating ?? 0));
      setProblems(list);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching problems:', err);
      setProblems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(level);
  }, [level]);

  useEffect(() => {
    const id = setInterval(() => {
      load(level);
    }, REFRESH_MS);

    return () => clearInterval(id);
  }, [level, user?.id]);

  const solvedSet = useMemo(() => new Set(), [user]);

  const getProblemLink = (problem) => {
    const contestId = problem.contest_id ?? problem.contestId;
    const index = problem.index;
    if (!contestId || !index) return 'https://codeforces.com';
    return `https://codeforces.com/contest/${contestId}/problem/${index}`;
  };

  return (
    <div style={{ maxWidth: 1100, margin: '40px auto', padding: 20 }}>
      <div
        style={{
          padding: 20,
          borderRadius: 20,
          background: 'rgba(20,20,25,0.7)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
          marginBottom: 20,
        }}
      >
        <h1 style={{ marginBottom: 8 }}>Practice</h1>
        <p style={{ opacity: 0.8, marginBottom: 16 }}>
          Personalized problem sheets, auto refresh, and solved-state tracking.
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => setLevel('div2')}>Div 2</button>
          <button onClick={() => setLevel('div3')}>Div 3</button>
          <button onClick={() => setLevel('personal')}>Personalized</button>
          <button onClick={() => load(level)}>Refresh now</button>
        </div>

        <div style={{ marginTop: 12, opacity: 0.75 }}>
          {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : 'Not loaded yet'}
        </div>
      </div>

      {loading ? (
        <div>Loading problems...</div>
      ) : problems.length === 0 ? (
        <div>No problems found.</div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {problems.map((p, i) => {
            const solved = solvedSet.has(`${p.contest_id ?? p.contestId}-${p.index}`);
            return (
              <div
                key={`${p.contest_id ?? p.contestId}-${p.index}-${i}`}
                style={{
                  padding: 18,
                  borderRadius: 18,
                  background: solved
                    ? 'rgba(0,255,120,0.12)'
                    : 'rgba(255,255,255,0.05)',
                  border: solved
                    ? '1px solid rgba(0,255,120,0.6)'
                    : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: solved
                    ? '0 0 18px rgba(0,255,120,0.18)'
                    : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>
                      {p.name}{solved ? ' ✓' : ''}
                    </div>
                    <div style={{ opacity: 0.8, marginTop: 6 }}>
                      Rating: {p.rating ?? 'N/A'} | Contest: {p.contest_id ?? p.contestId ?? 'N/A'}{p.index ? ` | ${p.index}` : ''}
                    </div>
                  </div>

                  <a href={getProblemLink(p)} target="_blank" rel="noreferrer">
                    Solve
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}