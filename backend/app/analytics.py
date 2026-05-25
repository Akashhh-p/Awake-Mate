from __future__ import annotations


def calculate_focus_score(alerts: int, drowsy_seconds: float, duration_seconds: float) -> int:
    if duration_seconds <= 0:
        return 100
    drowsy_penalty = min(65, (drowsy_seconds / duration_seconds) * 80)
    alert_penalty = min(55, alerts * 8)
    return max(0, min(100, round(100 - drowsy_penalty - alert_penalty)))
