from __future__ import annotations

import asyncio

from fastapi import Depends, FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.database import analytics_summary, get_all_mode_settings, init_db, session_history, update_mode_settings
from app.firebase_auth import require_firebase_user, verify_firebase_token, verify_websocket_token
from app.models import ChangeModeRequest, ModeSettingsUpdate, StartRequest, StatusResponse
from app.monitor import monitor

init_db()

app = FastAPI(title="AwakeMate API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?|https://.*\.vercel\.app|https://awake-mate\.web\.app|https://awake-mate\.firebaseapp\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def public_status() -> dict:
    return {key: value for key, value in monitor.snapshot().items() if key != "frame"}


@app.options("/{path:path}")
def options_fallback(path: str) -> dict:
    return {"ok": True}


@app.get("/health")
@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "service": "AwakeMate API"}


@app.get("/status", response_model=StatusResponse)
@app.get("/api/status", response_model=StatusResponse)
def status():
    return public_status()


@app.post("/start-session", response_model=StatusResponse)
@app.post("/api/start-session", response_model=StatusResponse)
def start_session(payload: StartRequest):
    decoded = verify_firebase_token(payload.firebase_token or "")
    monitor.start(payload.mode, firebase_uid=decoded["uid"])
    return public_status()


@app.post("/stop-session", response_model=StatusResponse)
@app.post("/api/stop-session", response_model=StatusResponse)
def stop_session():
    if monitor.is_browser_active:
        monitor.stop_browser_session()
    else:
        monitor.stop()
    return public_status()


@app.post("/stop-alarm", response_model=StatusResponse)
@app.post("/api/stop-alarm", response_model=StatusResponse)
def stop_alarm():
    monitor.stop_alarm()
    return public_status()


@app.post("/change-mode", response_model=StatusResponse)
@app.post("/api/change-mode", response_model=StatusResponse)
def change_mode(payload: ChangeModeRequest):
    monitor.change_mode(payload.mode)
    return public_status()


@app.get("/session-history")
@app.get("/api/session-history")
def get_session_history(firebase_user: dict = Depends(require_firebase_user)):
    return session_history(firebase_uid=firebase_user["uid"])


@app.get("/analytics")
@app.get("/api/analytics")
def get_analytics(firebase_user: dict = Depends(require_firebase_user)):
    return analytics_summary(firebase_uid=firebase_user["uid"])


@app.get("/mode-settings")
@app.get("/api/mode-settings")
def mode_settings():
    return get_all_mode_settings()


@app.put("/mode-settings", response_model=StatusResponse)
@app.put("/api/mode-settings", response_model=StatusResponse)
def save_mode_settings(payload: ModeSettingsUpdate):
    saved = update_mode_settings(payload.model_dump())
    monitor.apply_settings(saved)
    return public_status()


@app.websocket("/ws/monitor")
async def monitor_socket(websocket: WebSocket):
    await websocket.accept()
    monitor.register(websocket)
    try:
        while True:
            await monitor.broadcast()
            await asyncio.sleep(0.2)
    except WebSocketDisconnect:
        monitor.unregister(websocket)


@app.websocket("/ws/browser-monitor")
async def browser_monitor_socket(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            payload = await websocket.receive_json()
            event = payload.get("event")
            if event == "start":
                decoded = await verify_websocket_token(websocket, payload.get("firebase_token"))
                if decoded is None:
                    continue
                status = monitor.start_browser_session(payload.get("mode", "study"), firebase_uid=decoded["uid"])
                await websocket.send_json(status)
            elif event == "frame":
                try:
                    status = await monitor.process_browser_frame(payload.get("frame", ""))
                except Exception as exc:
                    status = monitor.mark_error(f"Detection failed: {exc}")
                await websocket.send_json(status)
            elif event == "change-mode":
                status = monitor.change_mode(payload.get("mode", "study"))
                await websocket.send_json(status)
            elif event == "stop-alarm":
                status = monitor.stop_alarm()
                await websocket.send_json(status)
            elif event == "stop":
                status = monitor.stop_browser_session()
                await websocket.send_json(status)
            else:
                await websocket.send_json(monitor.snapshot())
    except WebSocketDisconnect:
        monitor.stop_browser_session()
    except Exception as exc:
        monitor.mark_error(f"Monitoring socket failed: {exc}")
        monitor.stop_browser_session()
