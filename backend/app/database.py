from __future__ import annotations

import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any

from app.config import DATABASE_PATH, DATA_DIR, DEFAULT_MODE_SETTINGS


def get_connection() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH, check_same_thread=False)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                mode TEXT NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT,
                duration REAL DEFAULT 0,
                focus_score INTEGER DEFAULT 100,
                total_alerts INTEGER DEFAULT 0,
                awake_time REAL DEFAULT 0,
                drowsy_time REAL DEFAULT 0
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER,
                mode TEXT NOT NULL,
                alert_time TEXT NOT NULL,
                alert_level TEXT NOT NULL,
                eye_closed_duration REAL NOT NULL,
                screenshot_path TEXT,
                FOREIGN KEY(session_id) REFERENCES sessions(id)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS mode_settings (
                mode TEXT PRIMARY KEY,
                threshold_seconds REAL NOT NULL,
                alarm_level TEXT NOT NULL,
                break_reminder_minutes INTEGER NOT NULL,
                snooze_allowed INTEGER NOT NULL,
                emergency_mode INTEGER NOT NULL
            )
            """
        )
        conn.executemany(
            """
            INSERT OR IGNORE INTO mode_settings (
                mode, threshold_seconds, alarm_level, break_reminder_minutes, snooze_allowed, emergency_mode
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            DEFAULT_MODE_SETTINGS,
        )


def row_to_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    return dict(row) if row else None


def get_mode_settings(mode: str) -> dict[str, Any]:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM mode_settings WHERE mode = ?", (mode,)).fetchone()
    if row is None:
        return get_mode_settings("study")
    settings = row_to_dict(row)
    settings["snooze_allowed"] = bool(settings["snooze_allowed"])
    settings["emergency_mode"] = bool(settings["emergency_mode"])
    return settings


def get_all_mode_settings() -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM mode_settings ORDER BY mode").fetchall()
    settings = []
    for row in rows:
        item = row_to_dict(row)
        item["snooze_allowed"] = bool(item["snooze_allowed"])
        item["emergency_mode"] = bool(item["emergency_mode"])
        settings.append(item)
    return settings


def create_session(mode: str) -> int:
    with get_connection() as conn:
        cursor = conn.execute(
            "INSERT INTO sessions (mode, start_time) VALUES (?, ?)",
            (mode, datetime.now().isoformat(timespec="seconds")),
        )
        return int(cursor.lastrowid)


def finish_session(
    session_id: int,
    duration: float,
    focus_score: int,
    total_alerts: int,
    awake_time: float,
    drowsy_time: float,
) -> None:
    with get_connection() as conn:
        conn.execute(
            """
            UPDATE sessions
            SET end_time = ?, duration = ?, focus_score = ?, total_alerts = ?, awake_time = ?, drowsy_time = ?
            WHERE id = ?
            """,
            (
                datetime.now().isoformat(timespec="seconds"),
                round(duration, 2),
                focus_score,
                total_alerts,
                round(awake_time, 2),
                round(drowsy_time, 2),
                session_id,
            ),
        )


def update_session_mode(session_id: int | None, mode: str) -> None:
    if session_id is None:
        return
    with get_connection() as conn:
        conn.execute("UPDATE sessions SET mode = ? WHERE id = ?", (mode, session_id))


def insert_alert(
    session_id: int | None,
    mode: str,
    alert_level: str,
    eye_closed_duration: float,
    screenshot_path: str | None,
) -> None:
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO alerts (session_id, mode, alert_time, alert_level, eye_closed_duration, screenshot_path)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                session_id,
                mode,
                datetime.now().isoformat(timespec="seconds"),
                alert_level,
                round(eye_closed_duration, 2),
                screenshot_path,
            ),
        )


def session_history() -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM sessions ORDER BY id DESC").fetchall()
    return [row_to_dict(row) for row in rows]


def alert_history(limit: int = 100) -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM alerts ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
    return [row_to_dict(row) for row in rows]


def analytics_summary() -> dict[str, Any]:
    sessions = session_history()
    alerts = alert_history(500)
    completed = [session for session in sessions if session.get("end_time")]
    total_sessions = len(completed)
    total_alerts = sum(int(session.get("total_alerts") or 0) for session in completed)
    avg_focus = round(
        sum(int(session.get("focus_score") or 0) for session in completed) / total_sessions,
        1,
    ) if total_sessions else 100
    return {
        "total_sessions": total_sessions,
        "total_alerts": total_alerts,
        "average_focus_score": avg_focus,
        "sessions": completed,
        "alerts": alerts,
    }
