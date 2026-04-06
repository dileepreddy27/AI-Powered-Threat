from __future__ import annotations

import ipaddress
import math
from collections import defaultdict, deque
from datetime import UTC, datetime, timedelta
from typing import Iterable, Sequence

import numpy as np

from .schemas import LogEvent

METHOD_CODES = {
    "GET": 0,
    "POST": 1,
    "PUT": 2,
    "PATCH": 3,
    "DELETE": 4,
    "OPTIONS": 5,
    "HEAD": 6,
}

SUSPICIOUS_SQL_TOKENS = (
    "select",
    "union",
    "drop",
    "insert",
    "update",
    "delete",
    "' or 1=1",
    "--",
    "sleep(",
)

SUSPICIOUS_ATTACK_TOKENS = (
    "../",
    "..\\",
    "/etc/passwd",
    "phpmyadmin",
    "wp-admin",
    "<script",
)

FEATURE_COLUMNS = [
    "hour",
    "minute",
    "method_code",
    "status_code",
    "bytes_log",
    "path_length",
    "path_entropy",
    "ua_length",
    "is_private_source",
    "is_private_destination",
    "source_octet_1",
    "source_octet_2",
    "source_octet_3",
    "source_octet_4",
    "dest_octet_1",
    "dest_octet_2",
    "dest_octet_3",
    "dest_octet_4",
    "has_sql_keyword",
    "has_attack_pattern",
    "has_admin_path",
    "is_error_status",
    "request_rate_10s",
]


class RequestRateTracker:
    """Keeps a moving count of requests per source IP over a 10-second window."""

    def __init__(self, window_seconds: int = 10) -> None:
        self.window_seconds = window_seconds
        self._windows: dict[str, deque[datetime]] = defaultdict(deque)

    def update(self, source_ip: str, event_time: datetime) -> float:
        ip_key = source_ip or "unknown"
        queue = self._windows[ip_key]
        queue.append(event_time)
        window_start = event_time.timestamp() - self.window_seconds
        while queue and queue[0].timestamp() < window_start:
            queue.popleft()
        return float(len(queue)) / float(self.window_seconds)


def _safe_datetime(value: datetime | None) -> datetime:
    if value is None:
        return datetime.now(tz=UTC)
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


def _ip_to_features(ip_address: str | None) -> tuple[float, float, float, float, float]:
    if not ip_address:
        return 0.0, 0.0, 0.0, 0.0, 0.0
    try:
        ip_obj = ipaddress.ip_address(ip_address)
    except ValueError:
        return 0.0, 0.0, 0.0, 0.0, 0.0

    octets = str(ip_obj).split(".")
    if len(octets) == 4:
        return (
            float(int(octets[0])),
            float(int(octets[1])),
            float(int(octets[2])),
            float(int(octets[3])),
            1.0 if ip_obj.is_private else 0.0,
        )

    return 0.0, 0.0, 0.0, 0.0, 1.0 if ip_obj.is_private else 0.0


def _path_entropy(path: str) -> float:
    if not path:
        return 0.0
    probs = [path.count(ch) / len(path) for ch in set(path)]
    return float(-sum(prob * math.log2(prob) for prob in probs if prob > 0))


def _bool_to_float(value: bool) -> float:
    return 1.0 if value else 0.0


def events_to_feature_matrix(
    events: Sequence[LogEvent],
    tracker: RequestRateTracker | None = None,
) -> tuple[np.ndarray, list[dict[str, float | str]]]:
    tracker = tracker or RequestRateTracker()
    vectors: list[list[float]] = []
    metadata: list[dict[str, float | str]] = []

    for event in events:
        event_time = _safe_datetime(event.event_time)
        method = (event.method or "GET").upper()
        path = event.path or "/"
        lower_path = path.lower()
        user_agent = event.user_agent or ""
        source_ip = event.source_ip or ""
        destination_ip = event.destination_ip or ""
        status_code = int(event.status_code or 0)
        bytes_sent = max(0, int(event.bytes_sent or 0))

        src_1, src_2, src_3, src_4, src_private = _ip_to_features(source_ip)
        dst_1, dst_2, dst_3, dst_4, dst_private = _ip_to_features(destination_ip)

        has_sql = any(token in lower_path for token in SUSPICIOUS_SQL_TOKENS)
        has_attack_pattern = any(token in lower_path for token in SUSPICIOUS_ATTACK_TOKENS)
        has_admin_path = any(token in lower_path for token in ("admin", "login", "auth"))
        is_error_status = status_code >= 400
        request_rate = tracker.update(source_ip=source_ip, event_time=event_time)

        feature_row = [
            float(event_time.hour),
            float(event_time.minute),
            float(METHOD_CODES.get(method, 99)),
            float(status_code),
            float(math.log1p(bytes_sent)),
            float(len(path)),
            _path_entropy(path),
            float(len(user_agent)),
            src_private,
            dst_private,
            src_1,
            src_2,
            src_3,
            src_4,
            dst_1,
            dst_2,
            dst_3,
            dst_4,
            _bool_to_float(has_sql),
            _bool_to_float(has_attack_pattern),
            _bool_to_float(has_admin_path),
            _bool_to_float(is_error_status),
            request_rate,
        ]

        vectors.append(feature_row)
        metadata.append(
            {
                "source_ip": source_ip,
                "path": path,
                "has_sql_keyword": _bool_to_float(has_sql),
                "has_attack_pattern": _bool_to_float(has_attack_pattern),
                "has_admin_path": _bool_to_float(has_admin_path),
                "is_error_status": _bool_to_float(is_error_status),
                "request_rate_10s": request_rate,
            }
        )

    return np.asarray(vectors, dtype=np.float32), metadata


def synthetic_benign_events(size: int = 250) -> list[LogEvent]:
    methods = ["GET", "GET", "GET", "POST"]
    paths = ["/api/health", "/api/products", "/api/orders", "/api/profile"]
    statuses = [200, 200, 200, 201, 204]
    agents = ["Mozilla/5.0", "Chrome/124.0", "Safari/17.4"]
    source_ips = ["192.168.1.10", "192.168.1.15", "172.16.5.7", "10.0.2.20"]
    destination = "10.0.0.11"

    now = datetime.now(tz=UTC)
    events: list[LogEvent] = []
    rng = np.random.default_rng(42)
    for i in range(size):
        event = LogEvent(
            event_time=now,
            source_ip=source_ips[i % len(source_ips)],
            destination_ip=destination,
            method=methods[i % len(methods)],
            path=paths[i % len(paths)],
            status_code=int(rng.choice(statuses)),
            bytes_sent=int(rng.integers(low=350, high=2800)),
            user_agent=agents[i % len(agents)],
        )
        events.append(event)
        now = now + timedelta(seconds=1)
    return events


def summarize_anomaly_types(rows: Iterable[dict[str, float | str]]) -> str:
    sql_count = 0
    attack_count = 0
    auth_count = 0
    for row in rows:
        sql_count += int(float(row.get("has_sql_keyword", 0.0)) > 0)
        attack_count += int(float(row.get("has_attack_pattern", 0.0)) > 0)
        auth_count += int(float(row.get("has_admin_path", 0.0)) > 0)

    parts = []
    if sql_count:
        parts.append(f"sql-patterns:{sql_count}")
    if attack_count:
        parts.append(f"attack-paths:{attack_count}")
    if auth_count:
        parts.append(f"auth-targets:{auth_count}")
    return ", ".join(parts) if parts else "no explicit signature pattern"
