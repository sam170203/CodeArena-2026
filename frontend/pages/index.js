import Link from "next/link";

export default function Home() {
  return (
    <div className="home-container">
      {/* Background Text */}
      <div className="bg-text">CodeArena</div>

      {/* Glass Card */}
      <div className="glass-card">
        <h1 className="title">CodeArena</h1>
        <p className="subtitle">
          Practice Codeforces problems. Duel in real-time. Track your growth.
        </p>

        <div className="button-group">
          <Link href="/practice"><button>Practice</button></Link>
          <Link href="/duel"><button>Duel</button></Link>
          <Link href="/profile"><button>Profile</button></Link>
        </div>

        <div className="button-group secondary">
          <Link href="/login"><button className="outline">Login</button></Link>
          <Link href="/register"><button className="outline">Register</button></Link>
        </div>
      </div>
    </div>
  );
}