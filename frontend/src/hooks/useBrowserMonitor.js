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

export function useBrowserMonitor(user = null, token = "") {
  const [status, setStatus] = useState(idleStatus);
  const [connected, setConnected] = useState(false);
  const [previewStream, setPreviewStream] = useState(null);
  const socketRef = useRef(null);
  const streamRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(document.createElement("canvas"));
  const timerRef = useRef(null);
  const frameTimeoutRef = useRef(null);
  const startAckRef = useRef(null);
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

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 360 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      setPreviewStream(stream);

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
        canvas.width = 320;
        canvas.height = 180;
        const context = canvas.getContext("2d");
        context.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        const frame = canvas.toDataURL("image/jpeg", 0.45);
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
        error: error.message || "Could not start monitoring.",
        frame: null,
        local_frame: null,
      }));
    }
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
    setStatus((previous) => ({ ...previous, mode }));
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
    connectSocket();
    return () => {
      runningRef.current = false;
      stopCamera();
      if (socketRef.current) socketRef.current.close();
    };
  }, []);

  return { status, connected, previewStream, start, stop, changeMode, stopAlarm };
}
