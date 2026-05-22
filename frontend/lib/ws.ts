type Listener<E> = (event: E) => void;

export class TypedWS<E extends { type: string }> {
  private socket: WebSocket | null = null;
  private listeners = new Set<Listener<E>>();
  private url: string;
  private retry = 0;
  private intentionallyClosed = false;
  private connected = false;

  constructor(url: string) {
    this.url = url;
  }

  connect() {
    this.intentionallyClosed = false;
    const socket = new WebSocket(this.url);
    this.socket = socket;
    socket.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as E;
        this.listeners.forEach((l) => l(data));
      } catch {
        // non-JSON frames ignored
      }
    };
    socket.onopen = () => {
      this.connected = true;
      this.retry = 0;
    };
    socket.onclose = () => {
      this.connected = false;
      if (this.intentionallyClosed) return;
      const delay = Math.min(1000 * 2 ** this.retry++, 10_000);
      setTimeout(() => this.connect(), delay);
    };
    socket.onerror = () => socket.close();
  }

  send(payload: object) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
    }
  }

  on(listener: Listener<E>) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  close() {
    this.intentionallyClosed = true;
    this.socket?.close();
  }

  isConnected() {
    return this.connected;
  }
}

export function wsUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_WS_BASE_URL ?? "ws://localhost:8000";
  return `${base}${path}`;
}
