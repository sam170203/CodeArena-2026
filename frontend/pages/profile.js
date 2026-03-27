import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import useAuthStore from '../store/authStore';
import { auth } from '../lib/api';

export default function ProfilePage() {
  const router = useRouter();
  const { token, user, fetchMe, hydrate } = useAuthStore();
  const [cfHandle, setCfHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (token === null) return;
    if (!token) {
      router.push('/login');
      return;
    }
    fetchMe();
  }, [token, router, fetchMe]);

  useEffect(() => {
    if (user?.cf_handle) setCfHandle(user.cf_handle);
  }, [user]);

  const updateHandle = async () => {
    setLoading(true);
    setMessage('');
    try {
      await auth.updateCfHandle(cfHandle);
      await auth.syncCf(cfHandle);
      await fetchMe();
      setMessage('CF handle synced successfully.');
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.detail || 'Failed to sync Codeforces handle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '60px auto', padding: 20 }}>
      <h1 style={{ marginBottom: 20 }}>Profile</h1>

      <p><strong>Email:</strong> {user?.email || '—'}</p>
      <p><strong>Username:</strong> {user?.username || 'Loading...'}</p>
      <p><strong>CF Rating:</strong> {user?.cf_rating ?? 0}</p>
      <p><strong>CF Rank:</strong> {user?.cf_rank || 'unrated'}</p>
      <p><strong>Solved Count:</strong> {user?.solved_count ?? 0}</p>

      <div style={{ marginTop: 20 }}>
        <h3>Codeforces Handle</h3>
        <input
          value={cfHandle}
          onChange={(e) => setCfHandle(e.target.value)}
          placeholder="Enter your handle"
          style={{ width: '100%', marginTop: 10, marginBottom: 10, padding: 10 }}
        />
        <button onClick={updateHandle} disabled={loading} style={{ padding: 10 }}>
          {loading ? 'Syncing...' : 'Save & Sync'}
        </button>
      </div>

      {message && <p style={{ marginTop: 12 }}>{message}</p>}
    </div>
  );
}