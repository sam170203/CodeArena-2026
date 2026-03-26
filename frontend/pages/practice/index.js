import { useEffect, useState } from 'react';
import { practice } from '../../lib/api';
import useAuthStore from '../../store/authStore';

export default function PracticePage() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState('div2');

  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const load = async () => {
      try {
        let res;
        if (level === 'div2') res = await practice.div2();
        else if (level === 'div3') res = await practice.div3();
        else res = await practice.generate({ rating: 1200, count: 10 });

        setProblems(res.data?.problems || []);
      } catch (err) {
        console.error('Error fetching problems:', err);
        setProblems([]);
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    load();
  }, [level]);

  const getProblemLink = (problem) => {
    const contestId = problem.contest_id ?? problem.contestId;
    const index = problem.index;

    if (!contestId || !index) return 'https://codeforces.com';

    return `https://codeforces.com/contest/${contestId}/problem/${index}`;
  };

  return (
    <div
      style={{
        padding: '24px',
        minHeight: '100vh',
        background: '#0f172a',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <h1 style={{ fontSize: '32px', marginBottom: '16px' }}>Practice</h1>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <button onClick={() => setLevel('div2')}>Div 2</button>
        <button onClick={() => setLevel('div3')}>Div 3</button>
        <button onClick={() => setLevel('custom')}>Custom</button>
      </div>

      {loading ? (
        <p>Loading problems...</p>
      ) : problems.length === 0 ? (
        <p>No problems found.</p>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {problems.map((p, i) => (
            <div
              key={`${p.contest_id || p.contestId || 'x'}-${p.index || i}`}
              style={{
                background: '#1e293b',
                padding: '16px',
                borderRadius: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{p.name}</div>
                <div style={{ color: '#cbd5e1', fontSize: '14px' }}>
                  Rating: {p.rating ?? 'N/A'} | Contest: {p.contest_id ?? p.contestId ?? 'N/A'}{p.index ? ` | ${p.index}` : ''}
                </div>
              </div>

              <a
                href={getProblemLink(p)}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: '#38bdf8',
                  color: '#000',
                  textDecoration: 'none',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap',
                }}
              >
                Solve
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}