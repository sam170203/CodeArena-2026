import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import useAuthStore from '../store/authStore';
import { auth } from '../lib/api';

export default function ProfilePage() {
  const router = useRouter();
  const { token, user, fetchMe } = useAuthStore();

  const [cfHandle, setCfHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      router.push('/login');
    } else {
      fetchMe();
    }
  }, []);

  useEffect(() => {
    if (user?.cf_handle) {
      setCfHandle(user.cf_handle);
    }
  }, [user]);

  const updateHandle = async () => {
    if (!user?.id) return;

    setLoading(true);
    setMessage('');

    try {
      await auth.updateCfHandle(user.id, cfHandle);
      setMessage('Updated successfully!');
      fetchMe();
    } catch (err) {
      console.error(err);
      setMessage('Failed to update');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#020617',
      color: 'white',
      padding: '32px'
    }}>
      <h1>Profile</h1>

      <div style={{ marginTop: '20px' }}>
        <p><strong>Email:</strong> {user?.email}</p>
        <p><strong>Username:</strong> {user?.username}</p>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3>Codeforces Handle</h3>

        <input
          value={cfHandle}
          onChange={(e) => setCfHandle(e.target.value)}
          placeholder="Enter your handle"
          style={{ marginRight: '10px' }}
        />

        <button onClick={updateHandle} disabled={loading}>
          {loading ? 'Saving...' : 'Save'}
        </button>

        {message && <p>{message}</p>}
      </div>
    </div>
  );
}