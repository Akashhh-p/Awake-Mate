from pydantic import BaseModel, Field


class StartRequest(BaseModel):
    mode: str = Field(default="study", pattern="^(study|work|driving)$")
    firebase_token: str | None = None


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


class ModeSettingsUpdate(BaseModel):
    mode: str = Field(pattern="^(study|work|driving)$")
    threshold_seconds: float = Field(ge=0.5, le=30)
    alarm_level: str = Field(pattern="^(low|soft|medium|very_loud|continuous)$")
    break_reminder_minutes: int = Field(ge=0, le=240)
    snooze_allowed: bool = True
    emergency_mode: bool = False


class AuthStartRequest(BaseModel):
    mode: str = Field(pattern="^(signup|forgot)$")
    name: str = Field(default="", max_length=80)
    email: str | None = Field(default=None, max_length=120)
    password: str | None = Field(default=None, min_length=6, max_length=128)
    channel: str = Field(default="email", pattern="^email$")


class AuthVerifyRequest(BaseModel):
    mode: str = Field(pattern="^(signup|forgot)$")
    name: str = Field(default="", max_length=80)
    email: str | None = Field(default=None, max_length=120)
    password: str = Field(min_length=6, max_length=128)
    channel: str = Field(default="email", pattern="^email$")
    otp: str = Field(min_length=4, max_length=8)


class LoginRequest(BaseModel):
    identity: str = Field(min_length=3, max_length=120)
    password: str = Field(min_length=6, max_length=128)


class GoogleAuthRequest(BaseModel):
    mode: str = Field(default="login", pattern="^(login|signup)$")
    credential: str = Field(min_length=20)


class AuthResponse(BaseModel):
    id: int
    name: str
    email: str | None = None
    mobile: str | None = None
    provider: str
    session_token: str | None = None
