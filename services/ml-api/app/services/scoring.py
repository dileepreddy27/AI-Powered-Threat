from __future__ import annotations

from typing import Any

import numpy as np


def classify_attack(path: str, has_sql: float, has_pattern: float, has_admin: float) -> str:
    lower_path = (path or "").lower()
    if has_sql > 0:
        return "sql_injection_probe"
    if "../" in lower_path or "/etc/passwd" in lower_path:
        return "path_traversal_probe"
    if "wp-admin" in lower_path or "phpmyadmin" in lower_path:
        return "admin_scanning"
    if has_admin > 0:
        return "auth_targeting"
    if has_pattern > 0:
        return "reconnaissance"
    return "unknown"


def build_reason(meta: dict[str, Any], anomaly_score: float) -> str:
    reasons: list[str] = []
    if anomaly_score > 0.7:
        reasons.append("model confidence is high for anomalous behavior")
    if float(meta.get("request_rate_10s", 0)) > 0.5:
        reasons.append("request rate spike from the same source")
    if float(meta.get("has_sql_keyword", 0)) > 0:
        reasons.append("SQL-like token in request path")
    if float(meta.get("has_attack_pattern", 0)) > 0:
        reasons.append("known attack signature in URL path")
    if float(meta.get("is_error_status", 0)) > 0:
        reasons.append("error response status suggests probing")
    return "; ".join(reasons) if reasons else "behavior deviates from learned baseline"


def threat_score(anomaly_score: float, meta: dict[str, Any]) -> tuple[float, str]:
    score = 70.0 * anomaly_score
    score += 12.0 * float(meta.get("has_sql_keyword", 0))
    score += 10.0 * float(meta.get("has_attack_pattern", 0))
    score += 6.0 * float(meta.get("has_admin_path", 0))
    score += 6.0 * float(meta.get("is_error_status", 0))
    score += min(10.0, 16.0 * float(meta.get("request_rate_10s", 0)))
    score = float(np.clip(score, 0.0, 100.0))

    if score >= 85:
        severity = "critical"
    elif score >= 65:
        severity = "high"
    elif score >= 40:
        severity = "medium"
    else:
        severity = "low"
    return score, severity

