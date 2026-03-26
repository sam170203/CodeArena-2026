import { useState } from 'react';
import { useRouter } from 'next/router';
import { auth } from '../lib/api';

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    setLoading(true);
    setError('');

    try {
      await auth.register({
        email,
        username,
        password,
      });

      alert("Registered successfully! Please login.");
      router.push('/login');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Registration failed');
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
        width: '320px'
      }}>
        <h2 style={{ marginBottom: '16px' }}>Register</h2>

        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ width: '100%', marginBottom: '10px' }}
        />

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
          onClick={handleRegister}
          disabled={loading}
          style={{ width: '100%' }}
        >
          {loading ? 'Registering...' : 'Register'}
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