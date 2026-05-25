from __future__ import annotations

import math
import wave
from pathlib import Path

import numpy as np

from app.config import ALARM_FILE


class AlarmManager:
    def __init__(self, alarm_file: Path = ALARM_FILE) -> None:
        self.alarm_file = alarm_file
        self.enabled = True
        self._initialized = False
        self._audio_available = True
        self._fallback = alarm_file.parent / "generated_alarm.wav"

    def _init(self) -> None:
        if self._initialized:
            return
        try:
            import pygame

            pygame.mixer.init()
            self.pygame = pygame
            self._initialized = True
        except Exception:
            self._audio_available = False

    def _fallback_sound(self) -> Path:
        self._fallback.parent.mkdir(parents=True, exist_ok=True)
        if self._fallback.exists():
            return self._fallback
        sample_rate = 44100
        samples = np.arange(int(sample_rate * 0.5))
        tone = 0.65 * np.sin(2 * math.pi * 980 * samples / sample_rate)
        audio = (tone * 32767).astype(np.int16)
        with wave.open(str(self._fallback), "w") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(sample_rate)
            wav.writeframes(audio.tobytes())
        return self._fallback

    def play(self, level: int, emergency: bool = False) -> None:
        if not self.enabled or level <= 0:
            return
        self._init()
        if not self._audio_available:
            return
        try:
            sound = self.alarm_file if self.alarm_file.exists() and self.alarm_file.stat().st_size else self._fallback_sound()
            if self.pygame.mixer.music.get_busy():
                return
            self.pygame.mixer.music.load(str(sound))
            self.pygame.mixer.music.set_volume(1.0 if emergency or level >= 3 else 0.45 + level * 0.2)
            self.pygame.mixer.music.play(loops=-1 if emergency or level >= 3 else 0)
        except Exception:
            self._audio_available = False

    def stop(self) -> None:
        if self._initialized and self._audio_available and self.pygame.mixer.music.get_busy():
            self.pygame.mixer.music.stop()
