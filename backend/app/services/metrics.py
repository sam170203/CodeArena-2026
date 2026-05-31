import time

from prometheus_client import Counter, Gauge, Histogram, generate_latest

# ── API-level metrics ──

REQUEST_COUNT = Counter(
    "api_requests_total",
    "Total API requests",
    labelnames=("method", "endpoint", "status"),
)

REQUEST_LATENCY = Histogram(
    "api_request_duration_seconds",
    "API request latency in seconds",
    labelnames=("method", "endpoint"),
    buckets=(0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)

# ── Business metrics ──

ACTIVE_DUELS = Gauge("active_duels_total", "Number of active duels right now")
QUEUED_PLAYERS = Gauge("queued_players_total", "Number of players in matchmaking queue")
TOTAL_USERS = Gauge("total_users", "Total registered users")
TOTAL_DUELS = Gauge("total_duels", "Total duels ever created")
WEBSOCKET_CONNECTIONS = Gauge("websocket_connections_total", "Current WebSocket connections")

# ── Database metrics ──

DB_QUERY_LATENCY = Histogram(
    "db_query_duration_seconds",
    "Database query latency in seconds",
    labelnames=("operation",),
    buckets=(0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0),
)

# ── Per-user metrics (tagged with user_id) ──

USER_REQUEST_COUNT = Counter(
    "user_requests_total",
    "Total requests per user",
    labelnames=("user_id", "method", "endpoint"),
)

USER_REQUEST_LATENCY = Histogram(
    "user_request_duration_seconds",
    "Request latency per user",
    labelnames=("user_id", "endpoint"),
    buckets=(0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)

USER_ERROR_COUNT = Counter(
    "user_errors_total",
    "Total errors per user",
    labelnames=("user_id", "status_code"),
)


class MetricsMiddleware:
    """FastAPI middleware that records request metrics."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        method = scope.get("method", "GET")
        path = scope.get("path", "/unknown")
        start = time.monotonic()

        async def _send(message):
            if message["type"] == "http.response.start":
                status = message.get("status", 200)
                REQUEST_COUNT.labels(method=method, endpoint=path, status=status).inc()
                REQUEST_LATENCY.labels(method=method, endpoint=path).observe(
                    time.monotonic() - start
                )
            await send(message)

        await self.app(scope, receive, _send)


def metrics_response():
    return generate_latest().decode("utf-8")
