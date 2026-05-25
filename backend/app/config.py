from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
ALERTS_DIR = BASE_DIR / "alerts"
SCREENSHOTS_DIR = ALERTS_DIR / "screenshots"
ASSETS_DIR = BASE_DIR / "assets"
DATABASE_PATH = DATA_DIR / "awakemate.db"
ALARM_FILE = ASSETS_DIR / "alarm.mp3"

DEFAULT_MODE_SETTINGS = [
    ("study", 3.0, "medium", 45, 1, 0),
    ("work", 4.0, "soft_medium", 60, 1, 0),
    ("driving", 1.5, "very_loud", 0, 0, 1),
]

EAR_THRESHOLD = 0.21
FACE_ABSENCE_LIMIT = 10.0
LONG_INACTIVITY_SECONDS = 30.0
