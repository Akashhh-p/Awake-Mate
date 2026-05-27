from __future__ import annotations

import json
import os
import base64
from functools import lru_cache
from pathlib import Path

from fastapi import Header, HTTPException, WebSocket


class FirebaseBackendConfigError(RuntimeError):
    pass


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
        service_account = _service_account_from_env()
        service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
        project_id = os.getenv("FIREBASE_PROJECT_ID")
        if service_account:
            cred = credentials.Certificate(service_account)
        elif service_account_path:
            path = Path(service_account_path)
            if not path.exists():
                raise FirebaseBackendConfigError(
                    "Firebase service account file was not found. On Render, set FIREBASE_SERVICE_ACCOUNT_JSON "
                    "or FIREBASE_SERVICE_ACCOUNT_B64 instead of a local Windows file path."
                )
            cred = credentials.Certificate(str(path))
        else:
            raise FirebaseBackendConfigError(
                "Firebase backend config is missing service account credentials. Set FIREBASE_SERVICE_ACCOUNT_JSON "
                "or FIREBASE_SERVICE_ACCOUNT_B64 in Render Environment Variables."
            )
        options = {"projectId": project_id} if project_id else None
        firebase_admin.initialize_app(cred, options)
    return auth


def _service_account_from_env() -> dict | None:
    service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON", "").strip()
    service_account_b64 = os.getenv("FIREBASE_SERVICE_ACCOUNT_B64", "").strip()

    if service_account_json:
        try:
            return json.loads(service_account_json)
        except json.JSONDecodeError as exc:
            raise FirebaseBackendConfigError(
                "FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON. Paste the full Firebase Admin SDK JSON object, "
                "or use FIREBASE_SERVICE_ACCOUNT_B64 with base64-encoded JSON."
            ) from exc

    if service_account_b64:
        try:
            decoded = base64.b64decode(service_account_b64).decode("utf-8")
            return json.loads(decoded)
        except Exception as exc:
            raise FirebaseBackendConfigError(
                "FIREBASE_SERVICE_ACCOUNT_B64 is invalid. It must be base64-encoded Firebase Admin SDK JSON."
            ) from exc

    return None


def verify_firebase_token(token: str) -> dict:
    if not token:
        raise HTTPException(status_code=401, detail="Missing Firebase ID token.")
    try:
        return firebase_admin_auth().verify_id_token(token)
    except HTTPException:
        raise
    except FirebaseBackendConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        message = str(exc)
        if "audience" in message or "project" in message:
            message = (
                "Firebase token project mismatch. Make sure Vercel frontend Firebase config and Render "
                "FIREBASE_PROJECT_ID/service account are from the same Firebase project."
            )
        raise HTTPException(status_code=401, detail=f"Invalid Firebase ID token: {message}") from exc


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
