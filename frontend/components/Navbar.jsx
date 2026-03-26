import Link from 'next/link';
import useAuthStore from '../store/authStore';

export default function Navbar() {
  const { token, setToken } = useAuthStore();

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    window.location.href = '/login';
  };

  return (
    <div style={{
      padding: '12px 24px',
      background: '#34ab77',
      display: 'flex',
      gap: '20px',
      color: 'white'
    }}>
      <Link href="/">Home</Link>
      <Link href="/profile">Profile</Link>
      <Link href="/practice">Practice</Link>
      <Link href="/duel">Duel</Link>

      {!token ? (
        <>
          <Link href="/login">Login</Link>
          <Link href="/register">Register</Link>
        </>
      ) : (
        <>
          <button onClick={logout}>Logout</button>
        </>
      )}
    </div>
  );
}