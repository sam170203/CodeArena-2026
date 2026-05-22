import Link from 'next/link';
import useAuthStore from '../store/authStore';

const linkStyle = {
  textDecoration: 'none',
  color: 'rgba(255,255,255,0.75)',
  fontSize: 14,
  fontWeight: 500,
  padding: '6px 12px',
  borderRadius: 8,
  transition: 'all 0.2s',
};

const activeLinkStyle = {
  ...linkStyle,
  color: 'white',
  background: 'rgba(255,255,255,0.08)',
};

export default function Navbar() {
  const { token, setToken } = useAuthStore();

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    window.location.href = '/login';
  };

  return (
    <div style={{
      padding: '10px 28px',
      background: 'rgba(10, 12, 22, 0.82)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      color: 'white',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <Link href="/" style={{
        ...linkStyle,
        fontWeight: 700,
        fontSize: 16,
        color: 'white',
        marginRight: 12,
        letterSpacing: '-0.3px',
      }}>
        CodeArena
      </Link>

      <div style={{ flex: 1 }} />

      <Link href="/practice" style={linkStyle}>Practice</Link>
      <Link href="/duel" style={linkStyle}>Duel</Link>
      <Link href="/profile" style={linkStyle}>Profile</Link>

      <span style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.08)', margin: '0 8px' }} />

      {!token ? (
        <>
          <Link href="/login" style={linkStyle}>Login</Link>
          <Link href="/register" style={{
            ...linkStyle,
            background: 'rgba(99, 102, 241, 0.2)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
          }}>Register</Link>
        </>
      ) : (
        <button onClick={logout} style={{
          ...linkStyle,
          border: 'none',
          cursor: 'pointer',
          background: 'transparent',
          color: 'rgba(255,255,255,0.55)',
        }}>Logout</button>
      )}
    </div>
  );
}