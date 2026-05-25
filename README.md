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

## Important Camera Notes

- Close other apps that use the webcam.
- Allow camera access in Windows privacy settings.
- If the dashboard says `User not detected`, the webcam is running but no face is visible.
- If it says `Webcam not found or blocked`, another app may be using the camera.

## Resume Description

Built AwakeMate, a production-style full-stack AI drowsiness detection system using React, Tailwind CSS, FastAPI, OpenCV, MediaPipe, WebSockets, and SQLite. Implemented real-time webcam monitoring, eye state detection, mode-specific alarm thresholds, SQLite session and alert storage, screenshot evidence capture, and a live analytics dashboard driven entirely by backend telemetry.
