from __future__ import annotations

import asyncio

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.database import analytics_summary, get_all_mode_settings, init_db, session_history
from app.models import ChangeModeRequest, StartRequest, StatusResponse
from app.monitor import monitor

init_db()

app = FastAPI(title="AwakeMate API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
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
    monitor.start(payload.mode)
    return public_status()


@app.post("/stop-session", response_model=StatusResponse)
@app.post("/api/stop-session", response_model=StatusResponse)
def stop_session():
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
def get_session_history():
    return session_history()


@app.get("/analytics")
@app.get("/api/analytics")
def get_analytics():
    return analytics_summary()


@app.get("/mode-settings")
@app.get("/api/mode-settings")
def mode_settings():
    return get_all_mode_settings()


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
                status = monitor.start_browser_session(payload.get("mode", "study"))
                await websocket.send_json(status)
            elif event == "frame":
                status = await monitor.process_browser_frame(payload.get("frame", ""))
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
