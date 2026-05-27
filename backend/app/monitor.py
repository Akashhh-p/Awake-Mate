from __future__ import annotations

import base64
import asyncio
import threading
import time
from datetime import datetime
from typing import Any

import cv2
import numpy as np

from app.alarm import AlarmManager
from app.analytics import calculate_focus_score
from app.config import FACE_ABSENCE_LIMIT, LONG_INACTIVITY_SECONDS, SCREENSHOTS_DIR
from app.database import (
    create_session,
    finish_session,
    get_mode_settings,
    init_db,
    insert_alert,
    update_mode_settings,
    update_session_mode,
)
from app.detector import DrowsinessDetector

MODE_LABELS = {"study": "Study", "work": "Work", "driving": "Driving"}
SCORE_LABELS = {"study": "Focus Score", "work": "Productivity Score", "driving": "Safety Score"}


class MonitorService:
    def __init__(self) -> None:
        init_db()
        self.running = False
        self.mode = "study"
        self.settings = get_mode_settings(self.mode)
        self.status: dict[str, Any] = self._idle_status()
        self._lock = threading.Lock()
        self._clients: set[Any] = set()
        self._clients_lock = threading.Lock()
        self._thread: threading.Thread | None = None
        self._session_id: int | None = None
        self._user_id: int | None = None
        self._firebase_uid: str | None = None
        self._session_start: datetime | None = None
        self._last_tick = time.time()
        self._closed_start: float | None = None
        self._face_missing_start: float | None = None
        self._alert_saved_for_closure = False
        self._alarm_muted_until_open = False
        self._alarm = AlarmManager()
        self._browser_detector: DrowsinessDetector | None = None
        self._browser_active = False
        self._browser_alerts = 0
        self._browser_awake_time = 0.0
        self._browser_drowsy_time = 0.0
        self._browser_last_tick = time.time()

    def _idle_status(self) -> dict[str, Any]:
        return {
            "running": False,
            "mode": self.mode,
            "mode_label": MODE_LABELS[self.mode],
            "eye_state": "Idle",
            "alarm_status": "Off",
            "alert_level": "none",
            "focus_score": 100,
            "score_label": SCORE_LABELS[self.mode],
            "alerts_count": 0,
            "ear_value": 0.0,
            "awake_time": 0.0,
            "drowsy_time": 0.0,
            "session_duration": 0.0,
            "face_detected": False,
            "threshold_seconds": self.settings["threshold_seconds"],
            "break_reminder_minutes": self.settings["break_reminder_minutes"],
            "snooze_allowed": self.settings["snooze_allowed"],
            "emergency_mode": self.settings["emergency_mode"],
            "inactivity_detected": False,
            "detector_backend": "not_started",
            "alarm_muted": False,
            "error": None,
            "last_screenshot": None,
            "frame": None,
            "break_due": False,
        }

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            return dict(self.status)

    @property
    def is_browser_active(self) -> bool:
        return self._browser_active

    def mark_error(self, message: str) -> dict[str, Any]:
        with self._lock:
            self.status = dict(self.status) | {
                "eye_state": "Error",
                "alarm_status": "Off",
                "error": message,
            }
        self._alarm.stop()
        return self.snapshot()

    def register(self, websocket: Any) -> None:
        with self._clients_lock:
            self._clients.add(websocket)

    def unregister(self, websocket: Any) -> None:
        with self._clients_lock:
            self._clients.discard(websocket)

    async def broadcast(self) -> None:
        payload = self.snapshot()
        with self._clients_lock:
            clients = list(self._clients)
        dead = []
        for client in clients:
            try:
                await client.send_json(payload)
            except Exception:
                dead.append(client)
        for client in dead:
            self.unregister(client)

    def change_mode(self, mode: str) -> dict[str, Any]:
        self.mode = mode
        self.settings = get_mode_settings(mode)
        with self._lock:
            self.status = dict(self.status) | {
                "mode": mode,
                "mode_label": MODE_LABELS[mode],
                "score_label": SCORE_LABELS[mode],
                "threshold_seconds": self.settings["threshold_seconds"],
                "break_reminder_minutes": self.settings["break_reminder_minutes"],
                "snooze_allowed": self.settings["snooze_allowed"],
                "emergency_mode": self.settings["emergency_mode"],
            }
        self._closed_start = None
        self._alert_saved_for_closure = False
        self._alarm_muted_until_open = False
        self._alarm.stop()
        update_session_mode(self._session_id, mode)
        return self.snapshot()

    def apply_settings(self, settings: dict[str, Any]) -> dict[str, Any]:
        saved = update_mode_settings(settings)
        if saved["mode"] == self.mode:
            self.settings = saved
            with self._lock:
                self.status = dict(self.status) | {
                    "threshold_seconds": saved["threshold_seconds"],
                    "break_reminder_minutes": saved["break_reminder_minutes"],
                    "snooze_allowed": saved["snooze_allowed"],
                    "emergency_mode": saved["emergency_mode"],
                }
        return self.snapshot()

    def start(self, mode: str, user_id: int | None = None, firebase_uid: str | None = None) -> dict[str, Any]:
        self.change_mode(mode)
        if self.running:
            return self.snapshot()

        self.running = True
        self._user_id = user_id
        self._firebase_uid = firebase_uid
        self._session_id = create_session(self.mode, user_id, firebase_uid)
        self._session_start = datetime.now()
        self._last_tick = time.time()
        self._closed_start = None
        self._face_missing_start = None
        self._alert_saved_for_closure = False
        self._alarm_muted_until_open = False
        with self._lock:
            self.status = self._idle_status() | {
                "running": True,
                "eye_state": "Starting",
                "detector_backend": "starting",
            }
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()
        return self.snapshot()

    def start_browser_session(self, mode: str, user_id: int | None = None, firebase_uid: str | None = None) -> dict[str, Any]:
        self.change_mode(mode)
        if self._browser_active:
            return self.snapshot()
        self._browser_active = True
        self.running = True
        self._user_id = user_id
        self._firebase_uid = firebase_uid
        self._session_id = create_session(self.mode, user_id, firebase_uid)
        self._session_start = datetime.now()
        self._browser_alerts = 0
        self._browser_awake_time = 0.0
        self._browser_drowsy_time = 0.0
        self._browser_last_tick = time.time()
        self._closed_start = None
        self._alert_saved_for_closure = False
        self._alarm_muted_until_open = False
        self._browser_detector = DrowsinessDetector()
        with self._lock:
            self.status = self._idle_status() | {
                "running": True,
                "eye_state": "Browser camera active",
                "detector_backend": self._browser_detector.backend,
            }
        return self.snapshot()

    def stop_browser_session(self) -> dict[str, Any]:
        if not self._browser_active and self._session_id is None:
            with self._lock:
                self.status = self._idle_status()
            return self.snapshot()
        duration = (datetime.now() - self._session_start).total_seconds() if self._session_start else 0.0
        score = calculate_focus_score(self._browser_alerts, self._browser_drowsy_time, duration)
        self._finish_session(duration, score, self._browser_alerts, self._browser_awake_time, self._browser_drowsy_time)
        self.running = False
        self._browser_active = False
        self._alarm.stop()
        if self._browser_detector:
            self._browser_detector.close()
            self._browser_detector = None
        with self._lock:
            self.status = dict(self.status) | {
                "running": False,
                "alarm_status": "Off",
                "alarm_muted": False,
                "frame": None,
                "break_due": False,
            }
        return self.snapshot()

    async def process_browser_frame(self, frame_data_url: str) -> dict[str, Any]:
        if not self._browser_active or self._browser_detector is None:
            return self.snapshot()

        frame = self._decode_frame(frame_data_url)
        if frame is None:
            return self.snapshot()

        now = time.time()
        delta = min(1.0, max(0.0, now - self._browser_last_tick))
        self._browser_last_tick = now

        detection, annotated = self._browser_detector.process(frame)
        eye_state = detection.status
        alarm_level = "none"
        alarm_status = "Off"
        last_screenshot = self.status.get("last_screenshot")
        inactivity_detected = False

        if not detection.face_detected:
            self._alarm.stop()
            self._closed_start = None
            self._alert_saved_for_closure = False
            if self._face_missing_start is None:
                self._face_missing_start = now
            missing_for = now - self._face_missing_start
            eye_state = "User not detected"
            inactivity_detected = self.mode == "work" and missing_for >= LONG_INACTIVITY_SECONDS
        else:
            self._face_missing_start = None
            if detection.eyes_closed:
                self._browser_drowsy_time += delta
                if self._closed_start is None:
                    self._closed_start = now
                closed_for = now - self._closed_start
                alarm_level = self._alarm_level_name(closed_for)
                if alarm_level != "none":
                    eye_state = "Sleeping" if alarm_level == "continuous" else "Drowsy"
                    if self._alarm_muted_until_open and self.settings["snooze_allowed"]:
                        alarm_status = "Muted"
                        self._alarm.stop()
                    else:
                        alarm_status = "On"
                        self._alarm.play(
                            self._alarm_level_number(alarm_level),
                            bool(self.settings["emergency_mode"]) or self.mode == "driving",
                        )
                    if not self._alert_saved_for_closure:
                        self._browser_alerts += 1
                        last_screenshot = self._save_screenshot(annotated)
                        insert_alert(self._session_id, self._user_id, self._firebase_uid, self.mode, alarm_level, closed_for, last_screenshot)
                        self._alert_saved_for_closure = True
                else:
                    eye_state = "Eyes Closed"
            else:
                self._browser_awake_time += delta
                self._closed_start = None
                self._alert_saved_for_closure = False
                self._alarm_muted_until_open = False
                eye_state = "Awake"
                self._alarm.stop()

        duration = (datetime.now() - self._session_start).total_seconds() if self._session_start else 0.0
        focus_score = calculate_focus_score(self._browser_alerts, self._browser_drowsy_time, duration)

        with self._lock:
            self.status = {
                "running": True,
                "mode": self.mode,
                "mode_label": MODE_LABELS[self.mode],
                "eye_state": eye_state,
                "alarm_status": alarm_status,
                "alert_level": alarm_level,
                "focus_score": focus_score,
                "score_label": SCORE_LABELS[self.mode],
                "alerts_count": self._browser_alerts,
                "ear_value": round(detection.ear, 3),
                "awake_time": round(self._browser_awake_time, 2),
                "drowsy_time": round(self._browser_drowsy_time, 2),
                "session_duration": round(duration, 2),
                "face_detected": detection.face_detected,
                "threshold_seconds": self.settings["threshold_seconds"],
                "break_reminder_minutes": self.settings["break_reminder_minutes"],
                "snooze_allowed": self.settings["snooze_allowed"],
                "emergency_mode": self.settings["emergency_mode"],
                "inactivity_detected": inactivity_detected,
                "detector_backend": self._browser_detector.backend,
                "alarm_muted": self._alarm_muted_until_open,
                "error": None,
                "last_screenshot": last_screenshot,
                "frame": None,
                "break_due": bool(self.settings["break_reminder_minutes"])
                and duration >= int(self.settings["break_reminder_minutes"]) * 60,
            }
        return self.snapshot()

    @staticmethod
    def _decode_frame(frame_data_url: str):
        try:
            if "," in frame_data_url:
                frame_data_url = frame_data_url.split(",", 1)[1]
            raw = base64.b64decode(frame_data_url)
            array = np.frombuffer(raw, dtype=np.uint8)
            return cv2.imdecode(array, cv2.IMREAD_COLOR)
        except Exception:
            return None

    def stop_alarm(self) -> dict[str, Any]:
        if not self.settings["snooze_allowed"]:
            return self.snapshot()
        self._alarm_muted_until_open = True
        self._alarm.stop()
        with self._lock:
            self.status = dict(self.status) | {
                "alarm_status": "Muted",
                "alarm_muted": True,
            }
        return self.snapshot()

    def stop(self) -> dict[str, Any]:
        self.running = False
        self._alarm.stop()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=3)
        return self.snapshot()

    @staticmethod
    def _encode_frame(frame) -> str:
        ok, buffer = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 65])
        if not ok:
            return ""
        return "data:image/jpeg;base64," + base64.b64encode(buffer).decode("ascii")

    def _alarm_level_name(self, closed_for: float) -> str:
        threshold = float(self.settings["threshold_seconds"])
        if closed_for < threshold:
            return "none"
        configured = str(self.settings.get("alarm_level") or "medium")
        if configured == "low":
            configured = "soft"
        if configured == "continuous" or closed_for >= threshold * 2:
            return "continuous"
        return configured

    @staticmethod
    def _alarm_level_number(level: str) -> int:
        return {"none": 0, "low": 1, "soft": 1, "medium": 2, "very_loud": 3, "continuous": 3}.get(level, 0)

    def _save_screenshot(self, frame) -> str:
        SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)
        path = SCREENSHOTS_DIR / f"alert_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
        cv2.imwrite(str(path), frame)
        return str(path)

    def _overlay(self, frame, eye_state: str, ear: float, score: int, alerts: int) -> None:
        color = (0, 255, 120)
        if eye_state == "Drowsy":
            color = (0, 180, 255)
        if eye_state == "Sleeping":
            color = (0, 0, 255)
        lines = [
            f"AwakeMate {MODE_LABELS[self.mode]}",
            f"Eye: {eye_state}",
            f"EAR: {ear:.3f}",
            f"{SCORE_LABELS[self.mode]}: {score}",
            f"Alerts: {alerts}",
        ]
        y = 30
        for line in lines:
            cv2.putText(frame, line, (18, y), cv2.FONT_HERSHEY_SIMPLEX, 0.66, color, 2, cv2.LINE_AA)
            y += 28

    def _finish_session(self, duration: float, score: int, alerts: int, awake: float, drowsy: float) -> None:
        if self._session_id is None:
            return
        finish_session(self._session_id, duration, score, alerts, awake, drowsy)
        self._session_id = None
        self._user_id = None
        self._firebase_uid = None

    def _loop(self) -> None:
        detector = None
        cap = None
        alerts = 0
        awake_time = 0.0
        drowsy_time = 0.0
        last_screenshot = None
        focus_score = 100
        duration = 0.0

        try:
            detector = DrowsinessDetector()
            cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
            if not cap.isOpened():
                cap = cv2.VideoCapture(0)
            if not cap.isOpened():
                raise RuntimeError("Webcam not found or blocked by another app.")
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

            while self.running:
                ok, frame = cap.read()
                now = time.time()
                delta = min(1.0, max(0.0, now - self._last_tick))
                self._last_tick = now
                if not ok:
                    raise RuntimeError("Webcam frame could not be read.")

                detection, annotated = detector.process(frame)
                eye_state = detection.status
                alarm_level = "none"
                alarm_status = "Off"
                inactivity_detected = False

                if not detection.face_detected:
                    self._alarm.stop()
                    self._closed_start = None
                    self._alert_saved_for_closure = False
                    if self._face_missing_start is None:
                        self._face_missing_start = now
                    missing_for = now - self._face_missing_start
                    eye_state = "User not detected"
                    inactivity_detected = self.mode == "work" and missing_for >= LONG_INACTIVITY_SECONDS
                else:
                    self._face_missing_start = None
                    if detection.eyes_closed:
                        drowsy_time += delta
                        if self._closed_start is None:
                            self._closed_start = now
                        closed_for = now - self._closed_start
                        alarm_level = self._alarm_level_name(closed_for)
                        if alarm_level != "none":
                            eye_state = "Sleeping" if alarm_level == "continuous" else "Drowsy"
                            if self._alarm_muted_until_open and self.settings["snooze_allowed"]:
                                alarm_status = "Muted"
                                self._alarm.stop()
                            else:
                                alarm_status = "On"
                                self._alarm.play(
                                    self._alarm_level_number(alarm_level),
                                    bool(self.settings["emergency_mode"]) or self.mode == "driving",
                                )
                            if not self._alert_saved_for_closure:
                                alerts += 1
                                last_screenshot = self._save_screenshot(annotated)
                                insert_alert(
                                    self._session_id,
                                    self._user_id,
                                    self._firebase_uid,
                                    self.mode,
                                    alarm_level,
                                    closed_for,
                                    last_screenshot,
                                )
                                self._alert_saved_for_closure = True
                        else:
                            eye_state = "Eyes Closed"
                    else:
                        awake_time += delta
                        self._closed_start = None
                        self._alert_saved_for_closure = False
                        self._alarm_muted_until_open = False
                        eye_state = "Awake"
                        self._alarm.stop()

                duration = (datetime.now() - self._session_start).total_seconds() if self._session_start else 0.0
                focus_score = calculate_focus_score(alerts, drowsy_time, duration)
                self._overlay(annotated, eye_state, detection.ear, focus_score, alerts)

                with self._lock:
                    self.status = {
                        "running": True,
                        "mode": self.mode,
                        "mode_label": MODE_LABELS[self.mode],
                        "eye_state": eye_state,
                        "alarm_status": alarm_status,
                        "alert_level": alarm_level,
                        "focus_score": focus_score,
                        "score_label": SCORE_LABELS[self.mode],
                        "alerts_count": alerts,
                        "ear_value": round(detection.ear, 3),
                        "awake_time": round(awake_time, 2),
                        "drowsy_time": round(drowsy_time, 2),
                        "session_duration": round(duration, 2),
                        "face_detected": detection.face_detected,
                        "threshold_seconds": self.settings["threshold_seconds"],
                        "break_reminder_minutes": self.settings["break_reminder_minutes"],
                        "snooze_allowed": self.settings["snooze_allowed"],
                        "emergency_mode": self.settings["emergency_mode"],
                        "inactivity_detected": inactivity_detected,
                        "detector_backend": detector.backend,
                        "alarm_muted": self._alarm_muted_until_open,
                        "error": None,
                        "last_screenshot": last_screenshot,
                        "frame": self._encode_frame(annotated),
                        "break_due": bool(self.settings["break_reminder_minutes"])
                        and duration >= int(self.settings["break_reminder_minutes"]) * 60,
                    }
                time.sleep(0.03)
        except Exception as exc:
            self.running = False
            with self._lock:
                self.status = self._idle_status() | {
                    "mode": self.mode,
                    "mode_label": MODE_LABELS[self.mode],
                    "eye_state": "Error",
                    "error": str(exc),
                    "detector_backend": detector.backend if detector else "not_started",
                }
        finally:
            self.running = False
            self._alarm.stop()
            if cap is not None:
                cap.release()
            if detector is not None:
                detector.close()
            self._finish_session(duration, focus_score, alerts, awake_time, drowsy_time)
            with self._lock:
                self.status = dict(self.status) | {
                    "running": False,
                    "alarm_status": "Off",
                    "frame": self.status.get("frame"),
                }


monitor = MonitorService()
