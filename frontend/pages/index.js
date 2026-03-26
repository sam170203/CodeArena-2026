import Link from 'next/link';

export default function HomePage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#020617',
        color: 'white',
        padding: '32px',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <h1 style={{ fontSize: '40px', marginBottom: '12px' }}>CodeArena</h1>
      <p style={{ color: '#cbd5e1', maxWidth: '640px' }}>
        Practice Codeforces problems, create duels, and build your competitive programming flow.
      </p>

      <div style={{ display: 'flex', gap: '12px', marginTop: '24px', flexWrap: 'wrap' }}>
        <Link href="/practice" style={{ color: '#38bdf8' }}>Go to Practice</Link>
        <Link href="/duel" style={{ color: '#38bdf8' }}>Go to Duel Lobby</Link>
        <Link href="/login" style={{ color: '#38bdf8' }}>Login</Link>
        <Link href="/register" style={{ color: '#38bdf8' }}>Register</Link>
      </div>
    </div>
  );
}