import { useEffect, useState } from 'react'

export default function DuelPage({ params }) {
  const duelId = params?.duelId
  const [socket, setSocket] = useState(null)
  const [messages, setMessages] = useState([])

  useEffect(() => {
    if (!duelId) return
    const ws = new WebSocket(`ws://localhost:8000/ws/duel/${duelId}`)
    ws.onmessage = (ev) => {
      const data = JSON.parse(ev.data)
      setMessages((m) => [...m, data])
    }
    setSocket(ws)
    return () => ws.close()
  }, [duelId])

  return (
    <div>
      <h1>Duel {duelId}</h1>
      <div style={{border: '1px solid #ccc', height: '300px', overflow: 'auto', padding: 8}}>
        {messages.map((m, idx) => (
          <div key={idx}>{JSON.stringify(m)}</div>
        ))}
      </div>
    </div>
  )
}
