from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path

from fastapi import Header, HTTPException, WebSocket


def load_backend_env() -> None:
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_backend_env()


@lru_cache(maxsize=1)
def firebase_admin_auth():
    try:
        import firebase_admin
        from firebase_admin import auth, credentials
    except Exception as exc:
        raise RuntimeError("firebase-admin is not installed. Install backend requirements.") from exc

    if not firebase_admin._apps:
        service_account = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
        service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
        if service_account:
            cred = credentials.Certificate(json.loads(service_account))
        elif service_account_path:
            cred = credentials.Certificate(service_account_path)
        else:
            project_id = os.getenv("FIREBASE_PROJECT_ID")
            if not project_id:
                raise RuntimeError("Firebase backend config is missing FIREBASE_PROJECT_ID or service account credentials.")
            cred = credentials.ApplicationDefault()
            firebase_admin.initialize_app(cred, {"projectId": project_id})
            return auth
        firebase_admin.initialize_app(cred)
    return auth


def verify_firebase_token(token: str) -> dict:
    if not token:
        raise HTTPException(status_code=401, detail="Missing Firebase ID token.")
    try:
        return firebase_admin_auth().verify_id_token(token)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Invalid Firebase ID token: {exc}") from exc


def require_firebase_user(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization bearer token is required.")
    return verify_firebase_token(authorization.removeprefix("Bearer ").strip())


async def verify_websocket_token(websocket: WebSocket, token: str | None) -> dict | None:
    if not token:
        await websocket.send_json({"running": False, "error": "Firebase ID token is required."})
        return None
    try:
        return verify_firebase_token(token)
    except HTTPException as exc:
        await websocket.send_json({"running": False, "error": exc.detail})
        return None
