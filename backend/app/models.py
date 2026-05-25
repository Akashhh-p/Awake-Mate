from pydantic import BaseModel, Field


class StartRequest(BaseModel):
    mode: str = Field(default="study", pattern="^(study|work|driving)$")


class StatusResponse(BaseModel):
    running: bool
    mode: str
    mode_label: str
    eye_state: str
    alarm_status: str
    alert_level: str
    focus_score: int
    score_label: str
    alerts_count: int
    ear_value: float
    awake_time: float
    drowsy_time: float
    session_duration: float
    face_detected: bool
    threshold_seconds: float
    break_reminder_minutes: int
    snooze_allowed: bool
    emergency_mode: bool
    inactivity_detected: bool
    detector_backend: str
    alarm_muted: bool
    error: str | None = None
    last_screenshot: str | None = None


class ChangeModeRequest(BaseModel):
    mode: str = Field(pattern="^(study|work|driving)$")
