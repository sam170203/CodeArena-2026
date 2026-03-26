import { useState } from 'react';
import { useRouter } from 'next/router';
import { auth } from '../lib/api';
import useAuthStore from '../store/authStore';

export default function LoginPage() {
  const router = useRouter();
  const setToken = useAuthStore((s) => s.setToken);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await auth.login({ email, password });

      const token = res.data?.access_token;
      if (!token) throw new Error("No token received");

      setToken(token);

      router.push('/practice'); // redirect after login
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: '#020617',
      color: 'white'
    }}>
      <div style={{
        padding: '24px',
        background: '#1e293b',
        borderRadius: '12px',
        width: '300px'
      }}>
        <h2 style={{ marginBottom: '16px' }}>Login</h2>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: '100%', marginBottom: '10px' }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: '100%', marginBottom: '10px' }}
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{ width: '100%' }}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>

        {error && (
          <p style={{ color: 'red', marginTop: '10px' }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}