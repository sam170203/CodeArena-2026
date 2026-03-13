import { useEffect, useState } from 'react'

export default function Problems() {
  const [problems, setProblems] = useState([])

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_BASE || 'http://backend:8000'
    fetch(`${base}/cf/problems`)
      .then(r => r.json())
      .then(data => setProblems(data.problems || []))
      .catch(() => setProblems([]))
  }, [])

  return (
    <div>
      <h1>CodeArena Problems</h1>
      <ul>
        {problems.slice(0, 20).map((p, idx) => (
          <li key={idx}>{p.name || p.title || 'Codeforces Problem'}</li>
        ))}
      </ul>
    </div>
  )
}
