from __future__ import annotations

import sqlite3
from datetime import datetime, timedelta
import hashlib
import secrets
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
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT,
                mobile TEXT,
                provider TEXT NOT NULL,
                password_hash TEXT,
                email_verified INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                UNIQUE(email, provider),
                UNIQUE(mobile, provider)
            )
            """
        )
        _ensure_column(conn, "users", "password_hash", "TEXT")
        _ensure_column(conn, "users", "email_verified", "INTEGER DEFAULT 0")
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS auth_otps (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                identity TEXT NOT NULL,
                channel TEXT NOT NULL,
                mode TEXT NOT NULL,
                otp_hash TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                consumed_at TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS auth_sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                firebase_uid TEXT,
                mode TEXT NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT,
                duration REAL DEFAULT 0,
                focus_score INTEGER DEFAULT 100,
                total_alerts INTEGER DEFAULT 0,
                awake_time REAL DEFAULT 0,
                drowsy_time REAL DEFAULT 0,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER,
                user_id INTEGER,
                firebase_uid TEXT,
                mode TEXT NOT NULL,
                alert_time TEXT NOT NULL,
                alert_level TEXT NOT NULL,
                eye_closed_duration REAL NOT NULL,
                screenshot_path TEXT,
                FOREIGN KEY(session_id) REFERENCES sessions(id),
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )
        _ensure_column(conn, "sessions", "user_id", "INTEGER")
        _ensure_column(conn, "sessions", "firebase_uid", "TEXT")
        _ensure_column(conn, "alerts", "user_id", "INTEGER")
        _ensure_column(conn, "alerts", "firebase_uid", "TEXT")
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


def _ensure_column(conn: sqlite3.Connection, table: str, column: str, definition: str) -> None:
    columns = [row["name"] for row in conn.execute(f"PRAGMA table_info({table})").fetchall()]
    if column not in columns:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


def row_to_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    return dict(row) if row else None


def normalize_identity(email: str | None = None, mobile: str | None = None) -> tuple[str, str]:
    if email:
        return "email", email.strip().lower()
    if mobile:
        return "mobile", "".join(mobile.strip().split())
    raise ValueError("Email or mobile number is required.")


def find_user_by_identity(email: str | None = None, mobile: str | None = None, provider: str | None = None) -> dict[str, Any] | None:
    channel, identity = normalize_identity(email, mobile)
    column = "email" if channel == "email" else "mobile"
    params: list[Any] = [identity]
    provider_sql = ""
    if provider:
        provider_sql = " AND provider = ?"
        params.append(provider)
    with get_connection() as conn:
        return row_to_dict(conn.execute(f"SELECT * FROM users WHERE {column} = ?{provider_sql}", params).fetchone())


def find_user_by_login(identity: str) -> dict[str, Any] | None:
    value = identity.strip().lower()
    compact = "".join(identity.strip().split())
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE email = ? OR mobile = ? ORDER BY id DESC LIMIT 1",
            (value, compact),
        ).fetchone()
    return row_to_dict(row)


def create_auth_session(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    with get_connection() as conn:
        conn.execute(
            "INSERT INTO auth_sessions (token, user_id, created_at) VALUES (?, ?, ?)",
            (token, user_id, datetime.now().isoformat(timespec="seconds")),
        )
    return token


def create_password_user(name: str, email: str | None, mobile: str | None, password_hash: str, provider: str, email_verified: bool) -> dict[str, Any]:
    channel, identity = normalize_identity(email, mobile)
    display_name = name.strip() or identity.split("@")[0]
    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO users (name, email, mobile, provider, password_hash, email_verified, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                display_name,
                identity if channel == "email" else None,
                identity if channel == "mobile" else None,
                provider,
                password_hash,
                int(email_verified),
                datetime.now().isoformat(timespec="seconds"),
            ),
        )
        user = conn.execute("SELECT * FROM users WHERE id = ?", (int(cursor.lastrowid),)).fetchone()
    return row_to_dict(user)


def update_user_password(user_id: int, password_hash: str) -> dict[str, Any]:
    with get_connection() as conn:
        conn.execute("UPDATE users SET password_hash = ? WHERE id = ?", (password_hash, user_id))
        user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return row_to_dict(user)


def issue_otp(identity: str, channel: str, mode: str) -> str:
    otp = f"{secrets.randbelow(1000000):06d}"
    expires_at = (datetime.now() + timedelta(minutes=10)).isoformat(timespec="seconds")
    otp_hash = hashlib.sha256(otp.encode("utf-8")).hexdigest()
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO auth_otps (identity, channel, mode, otp_hash, expires_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (identity, channel, mode, otp_hash, expires_at, datetime.now().isoformat(timespec="seconds")),
        )
    return otp


def verify_otp(identity: str, channel: str, mode: str, otp: str) -> None:
    otp_hash = hashlib.sha256(otp.strip().encode("utf-8")).hexdigest()
    now = datetime.now().isoformat(timespec="seconds")
    with get_connection() as conn:
        row = conn.execute(
            """
            SELECT * FROM auth_otps
            WHERE identity = ? AND channel = ? AND mode = ? AND consumed_at IS NULL
            ORDER BY id DESC
            LIMIT 1
            """,
            (identity, channel, mode),
        ).fetchone()
        if not row or row["otp_hash"] != otp_hash or row["expires_at"] < now:
            raise ValueError("Invalid or expired OTP.")
        conn.execute("UPDATE auth_otps SET consumed_at = ? WHERE id = ?", (now, row["id"]))


def get_mode_settings(mode: str) -> dict[str, Any]:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM mode_settings WHERE mode = ?", (mode,)).fetchone()
    if row is None:
        return get_mode_settings("study")
    settings = row_to_dict(row)
    if settings["alarm_level"] == "soft_medium":
        settings["alarm_level"] = "soft"
    settings["snooze_allowed"] = bool(settings["snooze_allowed"])
    settings["emergency_mode"] = bool(settings["emergency_mode"])
    return settings


def get_all_mode_settings() -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM mode_settings ORDER BY mode").fetchall()
    settings = []
    for row in rows:
        item = row_to_dict(row)
        if item["alarm_level"] == "soft_medium":
            item["alarm_level"] = "soft"
        item["snooze_allowed"] = bool(item["snooze_allowed"])
        item["emergency_mode"] = bool(item["emergency_mode"])
        settings.append(item)
    return settings


def update_mode_settings(settings: dict[str, Any]) -> dict[str, Any]:
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO mode_settings (
                mode, threshold_seconds, alarm_level, break_reminder_minutes, snooze_allowed, emergency_mode
            ) VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(mode) DO UPDATE SET
                threshold_seconds = excluded.threshold_seconds,
                alarm_level = excluded.alarm_level,
                break_reminder_minutes = excluded.break_reminder_minutes,
                snooze_allowed = excluded.snooze_allowed,
                emergency_mode = excluded.emergency_mode
            """,
            (
                settings["mode"],
                settings["threshold_seconds"],
                settings["alarm_level"],
                settings["break_reminder_minutes"],
                int(settings["snooze_allowed"]),
                int(settings["emergency_mode"]),
            ),
        )
    return get_mode_settings(settings["mode"])


def upsert_user(name: str, email: str | None, mobile: str | None, provider: str) -> dict[str, Any]:
    identity_clause = "email = ? AND provider = ?" if email else "mobile = ? AND provider = ?"
    identity_value = email or mobile
    if not identity_value:
        raise ValueError("Email or mobile number is required.")
    display_name = name.strip() or str(identity_value).split("@")[0]
    with get_connection() as conn:
        row = conn.execute(
            f"SELECT * FROM users WHERE {identity_clause}",
            (identity_value, provider),
        ).fetchone()
        if row:
            conn.execute(
                "UPDATE users SET name = ?, email = COALESCE(?, email), mobile = COALESCE(?, mobile) WHERE id = ?",
                (display_name, email, mobile, row["id"]),
            )
            user_id = row["id"]
        else:
            cursor = conn.execute(
                "INSERT INTO users (name, email, mobile, provider, created_at) VALUES (?, ?, ?, ?, ?)",
                (display_name, email, mobile, provider, datetime.now().isoformat(timespec="seconds")),
            )
            user_id = int(cursor.lastrowid)
        user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return row_to_dict(user)


def get_user(user_id: int | None) -> dict[str, Any] | None:
    if user_id is None:
        return None
    with get_connection() as conn:
        return row_to_dict(conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone())


def create_session(mode: str, user_id: int | None = None, firebase_uid: str | None = None) -> int:
    with get_connection() as conn:
        cursor = conn.execute(
            "INSERT INTO sessions (user_id, firebase_uid, mode, start_time) VALUES (?, ?, ?, ?)",
            (user_id, firebase_uid, mode, datetime.now().isoformat(timespec="seconds")),
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
    user_id: int | None,
    firebase_uid: str | None,
    mode: str,
    alert_level: str,
    eye_closed_duration: float,
    screenshot_path: str | None,
) -> None:
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO alerts (session_id, user_id, firebase_uid, mode, alert_time, alert_level, eye_closed_duration, screenshot_path)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                session_id,
                user_id,
                firebase_uid,
                mode,
                datetime.now().isoformat(timespec="seconds"),
                alert_level,
                round(eye_closed_duration, 2),
                screenshot_path,
            ),
        )


def session_history(user_id: int | None = None, firebase_uid: str | None = None) -> list[dict[str, Any]]:
    with get_connection() as conn:
        if firebase_uid is not None:
            rows = conn.execute("SELECT * FROM sessions WHERE firebase_uid = ? ORDER BY id DESC", (firebase_uid,)).fetchall()
        elif user_id is None:
            rows = conn.execute("SELECT * FROM sessions ORDER BY id DESC").fetchall()
        else:
            rows = conn.execute("SELECT * FROM sessions WHERE user_id = ? ORDER BY id DESC", (user_id,)).fetchall()
    return [row_to_dict(row) for row in rows]


def alert_history(limit: int = 100, user_id: int | None = None, firebase_uid: str | None = None) -> list[dict[str, Any]]:
    with get_connection() as conn:
        if firebase_uid is not None:
            rows = conn.execute("SELECT * FROM alerts WHERE firebase_uid = ? ORDER BY id DESC LIMIT ?", (firebase_uid, limit)).fetchall()
        elif user_id is None:
            rows = conn.execute("SELECT * FROM alerts ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
        else:
            rows = conn.execute("SELECT * FROM alerts WHERE user_id = ? ORDER BY id DESC LIMIT ?", (user_id, limit)).fetchall()
    return [row_to_dict(row) for row in rows]


def analytics_summary(user_id: int | None = None, firebase_uid: str | None = None) -> dict[str, Any]:
    sessions = session_history(user_id, firebase_uid)
    alerts = alert_history(500, user_id, firebase_uid)
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
