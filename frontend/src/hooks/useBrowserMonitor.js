import { useEffect, useRef, useState } from "react";
import { WS_BASE } from "../api/client";

const idleStatus = {
  running: false,
  mode: "study",
  mode_label: "Study",
  eye_state: "Idle",
  alarm_status: "Off",
  alert_level: "none",
  focus_score: 100,
  score_label: "Focus Score",
  alerts_count: 0,
  ear_value: 0,
  awake_time: 0,
  drowsy_time: 0,
  session_duration: 0,
  face_detected: false,
  threshold_seconds: 3,
  break_reminder_minutes: 45,
  snooze_allowed: true,
  emergency_mode: false,
  inactivity_detected: false,
  detector_backend: "not_started",
  alarm_muted: false,
  error: null,
  frame: null,
  local_frame: null,
  break_due: false,
};

const modeLabels = {
  study: "Study",
  work: "Work",
  driving: "Driving",
};

const scoreLabels = {
  study: "Focus Score",
  work: "Productivity Score",
  driving: "Safety Score",
};

export function useBrowserMonitor(user = null, token = "") {
  const [status, setStatus] = useState(idleStatus);
  const [connected, setConnected] = useState(false);
  const [previewStream, setPreviewStream] = useState(null);
  const [cameraFacing, setCameraFacing] = useState("user");
  const [cameraDevices, setCameraDevices] = useState([]);
  const [wakeLockSupported] = useState(() => "wakeLock" in navigator);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const socketRef = useRef(null);
  const streamRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(document.createElement("canvas"));
  const timerRef = useRef(null);
  const frameTimeoutRef = useRef(null);
  const startAckRef = useRef(null);
  const wakeLockRef = useRef(null);
  const inFlightRef = useRef(false);
  const runningRef = useRef(false);

  function connectSocket() {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      return socketRef.current;
    }
    if (socketRef.current && socketRef.current.readyState === WebSocket.CONNECTING) {
      return socketRef.current;
    }
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    const socket = new WebSocket(`${WS_BASE}/ws/browser-monitor`);
    socketRef.current = socket;
    socket.onopen = () => setConnected(true);
    socket.onclose = () => {
      inFlightRef.current = false;
      if (startAckRef.current) {
        startAckRef.current.reject(new Error(`Monitoring connection closed before startup. Check ${WS_BASE.replace(/^ws/, "http")}.`));
        startAckRef.current = null;
      }
      setConnected(false);
      if (runningRef.current) {
        setStatus((previous) => ({
          ...previous,
          running: false,
          eye_state: "Disconnected",
          error: `Monitoring connection closed. Check the backend at ${WS_BASE.replace(/^ws/, "http")}.`,
        }));
        runningRef.current = false;
        stopCamera();
      }
    };
    socket.onerror = () => {
      inFlightRef.current = false;
      if (startAckRef.current) {
        startAckRef.current.reject(new Error(`Monitoring connection failed. Check ${WS_BASE.replace(/^ws/, "http")}.`));
        startAckRef.current = null;
      }
      setConnected(false);
    };
    socket.onmessage = (event) => {
      inFlightRef.current = false;
      if (frameTimeoutRef.current) {
        clearTimeout(frameTimeoutRef.current);
        frameTimeoutRef.current = null;
      }
      const payload = JSON.parse(event.data);
      if (startAckRef.current) {
        const { resolve, reject } = startAckRef.current;
        startAckRef.current = null;
        if (payload.running) {
          resolve(payload);
        } else {
          reject(new Error(payload.error || "Backend did not start monitoring."));
        }
      }
      if (!runningRef.current && payload.running) return;
      setStatus((previous) => ({
        ...previous,
        ...payload,
        frame: payload.running === false ? null : payload.frame ?? previous.frame,
        local_frame: payload.running === false ? null : previous.local_frame,
      }));
    };
    return socket;
  }

  async function refreshCameraDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setCameraDevices(devices.filter((device) => device.kind === "videoinput"));
    } catch {
      setCameraDevices([]);
    }
  }

  async function requestWakeLock() {
    if (!("wakeLock" in navigator)) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request("screen");
      setWakeLockActive(true);
      wakeLockRef.current.addEventListener("release", () => setWakeLockActive(false));
    } catch {
      setWakeLockActive(false);
    }
  }

  async function releaseWakeLock() {
    try {
      await wakeLockRef.current?.release?.();
    } catch {
      // The lock may already be released by the browser.
    } finally {
      wakeLockRef.current = null;
      setWakeLockActive(false);
    }
  }

  function cameraErrorMessage(error) {
    if (!navigator.mediaDevices?.getUserMedia) {
      return "Camera access is not supported in this browser. Use a recent Chrome, Edge, Safari, or Firefox over HTTPS.";
    }
    if (error?.name === "NotAllowedError" || error?.name === "SecurityError") {
      return "Camera permission is blocked. Allow camera access in the browser settings, then start monitoring again.";
    }
    if (error?.name === "NotFoundError" || error?.name === "OverconstrainedError") {
      return "No suitable camera was found. Try switching camera or connect a camera.";
    }
    if (error?.name === "NotReadableError") {
      return "The camera is already in use by another app. Close that app and try again.";
    }
    return error?.message || "Could not start the camera on this device.";
  }

  function waitForSocket(socket) {
    if (socket.readyState === WebSocket.OPEN) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        socket.removeEventListener("open", handleOpen);
        socket.removeEventListener("error", handleError);
      };
      const handleOpen = () => {
        cleanup();
        resolve();
      };
      const handleError = () => {
        cleanup();
        reject(new Error(`Monitoring connection failed. Start the backend at ${WS_BASE.replace("ws", "http")}.`));
      };
      socket.addEventListener("open", handleOpen, { once: true });
      socket.addEventListener("error", handleError, { once: true });
    });
  }

  function waitForStartAck(socket) {
    return new Promise((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        startAckRef.current = null;
        reject(new Error(`Backend did not accept the monitoring session. Check ${WS_BASE.replace(/^ws/, "http")}.`));
      }, 15000);

      startAckRef.current = {
        resolve: (payload) => {
          clearTimeout(timeoutId);
          resolve(payload);
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
      };

      if (socket.readyState !== WebSocket.OPEN) {
        startAckRef.current = null;
        clearTimeout(timeoutId);
        reject(new Error("Monitoring socket closed before the session could start."));
      }
    });
  }

  async function start(mode) {
    if (runningRef.current) return;
    runningRef.current = true;
    stopCamera();
    setStatus((previous) => ({ ...previous, running: true, eye_state: "Starting", frame: null, local_frame: null, error: null }));
    try {
      const socket = connectSocket();
      await waitForSocket(socket);
      const freshToken = user?.getIdToken ? await user.getIdToken(true) : token;
      const startAccepted = waitForStartAck(socket);
      socket.send(JSON.stringify({ event: "start", mode, firebase_token: freshToken || token }));
      await startAccepted;

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(cameraErrorMessage());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 360 },
          facingMode: { ideal: cameraFacing },
        },
        audio: false,
      });
      streamRef.current = stream;
      setPreviewStream(stream);
      refreshCameraDevices();
      requestWakeLock();

      const video = document.createElement("video");
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();
      videoRef.current = video;

      timerRef.current = setInterval(() => {
        if (!videoRef.current || socket.readyState !== WebSocket.OPEN || inFlightRef.current) return;
        const videoEl = videoRef.current;
        if (videoEl.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
        const canvas = canvasRef.current;
        const sourceWidth = videoEl.videoWidth || 640;
        const sourceHeight = videoEl.videoHeight || 360;
        const maxFrameWidth = 640;
        const scale = Math.min(1, maxFrameWidth / sourceWidth);
        canvas.width = Math.max(240, Math.round(sourceWidth * scale));
        canvas.height = Math.max(180, Math.round(sourceHeight * scale));
        const context = canvas.getContext("2d");
        context.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        const frame = canvas.toDataURL("image/jpeg", 0.58);
        inFlightRef.current = true;
        socket.send(JSON.stringify({ event: "frame", frame }));
        frameTimeoutRef.current = window.setTimeout(() => {
          setStatus((previous) => ({
            ...previous,
            error: "Detection is responding slowly. Keeping the camera live while the backend catches up.",
          }));
        }, 3500);
      }, 250);
    } catch (error) {
      runningRef.current = false;
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ event: "stop" }));
      }
      stopCamera();
      setStatus((previous) => ({
        ...previous,
        running: false,
        eye_state: "Error",
        error: cameraErrorMessage(error),
        frame: null,
        local_frame: null,
      }));
    }
  }

  async function switchCamera(nextFacing = cameraFacing === "user" ? "environment" : "user") {
    setCameraFacing(nextFacing);
    if (!runningRef.current) return;
    const activeMode = status.mode || "study";
    stop();
    window.setTimeout(() => start(activeMode), 150);
  }

  function stopCamera() {
    inFlightRef.current = false;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (frameTimeoutRef.current) {
      clearTimeout(frameTimeoutRef.current);
      frameTimeoutRef.current = null;
    }
    startAckRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    releaseWakeLock();
    setPreviewStream(null);
    videoRef.current = null;
  }

  function stop() {
    runningRef.current = false;
    if (startAckRef.current) {
      startAckRef.current.reject(new Error("Monitoring startup was cancelled."));
      startAckRef.current = null;
    }
    stopCamera();
    setStatus((previous) => ({
      ...previous,
      running: false,
      alarm_status: "Off",
      alarm_muted: false,
      eye_state: "Idle",
      frame: null,
      local_frame: null,
    }));
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ event: "stop" }));
      socketRef.current.close();
      socketRef.current = null;
    }
  }

  function changeMode(mode) {
    setStatus((previous) => ({
      ...previous,
      mode,
      mode_label: modeLabels[mode] || previous.mode_label,
      score_label: scoreLabels[mode] || previous.score_label,
    }));
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ event: "change-mode", mode }));
    }
  }

  function stopAlarm() {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ event: "stop-alarm" }));
    }
  }

  useEffect(() => {
    refreshCameraDevices();
    connectSocket();
    return () => {
      runningRef.current = false;
      stopCamera();
      if (socketRef.current) socketRef.current.close();
    };
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && runningRef.current && !wakeLockRef.current) {
        requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  return {
    status,
    connected,
    previewStream,
    cameraFacing,
    cameraDevices,
    wakeLockSupported,
    wakeLockActive,
    start,
    stop,
    changeMode,
    stopAlarm,
    switchCamera,
  };
}
