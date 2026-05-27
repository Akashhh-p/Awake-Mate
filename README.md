# AwakeMate

AwakeMate is a full-stack real-time drowsiness detection and focus monitoring system. The browser captures webcam frames, sends them to a FastAPI backend over WebSocket, and the backend runs MediaPipe/OpenCV detection, alarm logic, SQLite storage, and analytics.

## What Is Real-Time

All dashboard values come from the backend through REST APIs and WebSocket updates:

- `eye_state`
- `mode`
- `ear_value`
- `focus_score`
- `alerts_count`
- `awake_time`
- `drowsy_time`
- `session_duration`
- `face_detected`
- `alarm_status`

No dashboard metric is hardcoded as demo data.

## Mode Behavior

| Mode | Eye Close Threshold | Alarm | Break Reminder | Special Rules |
|---|---:|---|---:|---|
| Study | 3 seconds | Medium | 45 minutes | Focus score and study session history |
| Work | 4 seconds | Soft/Medium | 60 minutes | Productivity score and long inactivity detection |
| Driving | 1.5 seconds | Very loud/continuous | None | Emergency mode on, no snooze, high-risk alerts |

Mode settings are stored in SQLite in the `mode_settings` table.

## Backend

- Python
- FastAPI
- OpenCV
- MediaPipe Face Mesh when available
- OpenCV fallback if the installed MediaPipe package does not expose Face Mesh
- NumPy
- Pygame alarm playback
- SQLite
- WebSocket streaming

## Frontend

- React
- Tailwind CSS
- Framer Motion
- Recharts
- Axios
- Lucide React
- Vite
- PWA manifest and service worker for installable mobile app behavior

## Folder Structure

```text
AwakeMate/
├── backend/
│   ├── app/
│   │   ├── alarm.py
│   │   ├── analytics.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── detector.py
│   │   ├── main.py
│   │   ├── models.py
│   │   └── monitor.py
│   ├── alerts/screenshots/
│   ├── assets/alarm.mp3
│   ├── data/awakemate.db
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── api/
    │   ├── components/
    │   ├── hooks/
    │   └── pages/
    ├── package.json
    ├── tailwind.config.js
    └── vite.config.js
```

## SQLite Tables

### sessions

- `id`
- `mode`
- `start_time`
- `end_time`
- `duration`
- `focus_score`
- `total_alerts`
- `awake_time`
- `drowsy_time`

### alerts

- `id`
- `session_id`
- `mode`
- `alert_time`
- `alert_level`
- `eye_closed_duration`
- `screenshot_path`

### mode_settings

- `mode`
- `threshold_seconds`
- `alarm_level`
- `break_reminder_minutes`
- `snooze_allowed`
- `emergency_mode`

## API Endpoints

```text
GET  /status
POST /start-session
POST /stop-session
POST /change-mode
GET  /session-history
GET  /analytics
GET  /mode-settings
WS   /ws/monitor
WS   /ws/browser-monitor
```

`/ws/browser-monitor` is the deployable production path. It receives frames from the browser webcam and returns real detection results.

## Setup

### Backend

```powershell
cd c:\projects\Awakemate\AwakeMate\backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend

Open a second terminal:

```powershell
cd c:\projects\Awakemate\AwakeMate\frontend
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:5173
```

## Deployment

### Backend on Render or Railway

Use these settings:

```text
Root directory: backend
Build command: pip install -r requirements.txt
Start command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

The backend requires Python 3.10 for the pinned MediaPipe Face Mesh package. Render reads this from:

```text
backend/.python-version
backend/runtime.txt
```

If Render still selects a newer Python version, set this environment variable in the Render service:

```text
PYTHON_VERSION=3.10.13
```

The backend does not need a webcam in deployment because the browser sends frames through `/ws/browser-monitor`.

### Frontend on Vercel or Netlify

Use these settings:

```text
Root directory: frontend
Build command: npm run build
Output directory: dist
```

Set this environment variable to your deployed backend URL:

```text
VITE_API_BASE=https://your-backend-service.onrender.com
```

For WebSocket support, the frontend automatically converts:

```text
https://your-backend-service.onrender.com
```

to:

```text
wss://your-backend-service.onrender.com
```

Camera access in browsers requires HTTPS, so use deployed HTTPS URLs for public demos.

### Firebase Backend Verification on Render

The FastAPI backend verifies Firebase ID tokens before saving user-specific history. Set these on the Render backend service, not on Vercel:

```text
FIREBASE_PROJECT_ID=awake-mate
FIREBASE_SERVICE_ACCOUNT_JSON=<full Firebase Admin SDK JSON>
```

Do not commit the service account JSON to GitHub. If you prefer not to paste multi-line JSON into Render, base64 encode the JSON file and use:

```text
FIREBASE_SERVICE_ACCOUNT_B64=<base64 Firebase Admin SDK JSON>
```

After changing Render environment variables, redeploy the backend.

## Important Camera Notes

- AwakeMate uses `navigator.mediaDevices.getUserMedia()` so the camera comes from the current device: laptop webcam, phone front camera, tablet camera, or supported external webcam.
- HTTPS is required for camera access on deployed sites. Localhost is allowed by browsers for development.
- Mobile starts with the front camera by default. Use the camera switch control in Live Monitoring to change between front and back cameras.
- Close other apps that use the camera.
- Allow camera access in browser/device privacy settings.
- If the dashboard says `User not detected`, the camera is running but no face is visible.
- If it says the camera is blocked or already in use, check browser permissions and other camera apps.

## Cross-Device Checklist

Before calling a deployment production-ready, test these flows:

- Login, signup, forgot password, and Google login on desktop and mobile.
- Camera permission prompt on Chrome desktop, Edge desktop, Chrome Android, Safari iPhone/iPad, and Firefox desktop.
- Front camera and back camera switching on phones/tablets.
- Start Monitoring, Stop Session, Stop Alarm, and mode switching.
- Alarm audio after pressing Start, because browsers require a user gesture before loud audio.
- Mobile vibration alerts on Android browsers that support `navigator.vibrate()`.
- Wake Lock behavior where supported; unsupported browsers show a fallback message.
- Dashboard cards, webcam panel, settings, history, and charts at phone, tablet, laptop, and desktop widths.
- PWA install prompt on supported browsers.

## Resume Description

Built AwakeMate, a production-style full-stack AI drowsiness detection system using React, Tailwind CSS, FastAPI, OpenCV, MediaPipe, WebSockets, and SQLite. Implemented real-time webcam monitoring, eye state detection, mode-specific alarm thresholds, SQLite session and alert storage, screenshot evidence capture, and a live analytics dashboard driven entirely by backend telemetry.
