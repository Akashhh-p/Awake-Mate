from __future__ import annotations

from dataclasses import dataclass
from collections import deque

import cv2
import numpy as np

from app.config import EAR_THRESHOLD

LEFT_EYE = [33, 160, 158, 133, 153, 144]
RIGHT_EYE = [362, 385, 387, 263, 373, 380]


@dataclass
class DetectionResult:
    face_detected: bool
    status: str
    ear: float
    eyes_closed: bool


class DrowsinessDetector:
    def __init__(self, ear_threshold: float = EAR_THRESHOLD) -> None:
        self.ear_threshold = ear_threshold
        self.backend = "mediapipe"
        self.face_mesh = None
        self.face_cascade = None
        self.eye_cascade = None
        self._ear_history = deque(maxlen=5)
        try:
            import mediapipe as mp

            solutions = getattr(mp, "solutions", None)
            if solutions is None:
                raise ImportError("Installed mediapipe package does not expose mediapipe.solutions.")
            self.face_mesh = solutions.face_mesh.FaceMesh(
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=0.6,
                min_tracking_confidence=0.6,
            )
        except Exception:
            self.backend = "opencv"
            self.face_cascade = cv2.CascadeClassifier(
                cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
            )
            self.eye_cascade = cv2.CascadeClassifier(
                cv2.data.haarcascades + "haarcascade_eye_tree_eyeglasses.xml"
            )
            if self.eye_cascade.empty():
                self.eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_eye.xml")

    @staticmethod
    def _distance(a: np.ndarray, b: np.ndarray) -> float:
        return float(np.linalg.norm(a - b))

    def _ear(self, points: list[np.ndarray], indices: list[int]) -> float:
        p1, p2, p3, p4, p5, p6 = [points[index] for index in indices]
        vertical = self._distance(p2, p6) + self._distance(p3, p5)
        horizontal = 2.0 * self._distance(p1, p4)
        return vertical / horizontal if horizontal else 0.0

    def process(self, frame):
        if self.backend == "opencv":
            return self._process_with_opencv(frame)

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        result = self.face_mesh.process(rgb)

        if not result.multi_face_landmarks:
            return DetectionResult(False, "User not detected", 0.0, False), frame

        height, width = frame.shape[:2]
        face = result.multi_face_landmarks[0]
        points = [np.array([lm.x * width, lm.y * height]) for lm in face.landmark]
        left_ear = self._ear(points, LEFT_EYE)
        right_ear = self._ear(points, RIGHT_EYE)
        ear = (left_ear + right_ear) / 2.0
        ear = self._smooth_ear(ear)
        eyes_closed = ear < self.ear_threshold

        for index in LEFT_EYE + RIGHT_EYE:
            x, y = points[index].astype(int)
            cv2.circle(frame, (x, y), 2, (0, 255, 255), -1)

        status = "Drowsy" if eyes_closed else "Awake"
        return DetectionResult(True, status, ear, eyes_closed), frame

    @staticmethod
    def _box_aspect_ratio(box) -> float:
        _, _, width, height = box
        return height / width if width else 0.0

    def _smooth_ear(self, ear: float) -> float:
        self._ear_history.append(ear)
        return float(sum(self._ear_history) / len(self._ear_history))

    def _process_with_opencv(self, frame):
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.equalizeHist(gray)
        faces = self.face_cascade.detectMultiScale(gray, scaleFactor=1.2, minNeighbors=5, minSize=(90, 90))

        if len(faces) == 0:
            return DetectionResult(False, "User not detected", 0.0, False), frame

        x, y, w, h = max(faces, key=lambda face: face[2] * face[3])
        cv2.rectangle(frame, (x, y), (x + w, y + h), (80, 220, 120), 2)

        upper_face = gray[y : y + int(h * 0.62), x : x + w]
        eyes = self.eye_cascade.detectMultiScale(upper_face, scaleFactor=1.1, minNeighbors=6, minSize=(18, 12))
        eyes = sorted([(x + ex, y + ey, ew, eh) for ex, ey, ew, eh in eyes], key=lambda box: box[2] * box[3], reverse=True)[:2]
        eyes = sorted(eyes, key=lambda box: box[0])

        for ex, ey, ew, eh in eyes:
            cv2.rectangle(frame, (ex, ey), (ex + ew, ey + eh), (0, 255, 255), 2)

        if not eyes:
            return DetectionResult(True, "Drowsy", 0.0, True), frame

        ear = sum(self._box_aspect_ratio(eye) for eye in eyes) / len(eyes)
        ear = self._smooth_ear(ear)
        eyes_closed = ear < self.ear_threshold
        status = "Drowsy" if eyes_closed else "Awake"
        return DetectionResult(True, status, ear, eyes_closed), frame

    def close(self) -> None:
        if self.face_mesh:
            self.face_mesh.close()
