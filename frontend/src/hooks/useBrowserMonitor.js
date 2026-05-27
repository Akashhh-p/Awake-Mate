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
  const socketRef = useRef(null);
  const streamRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(document.createElement("canvas"));
  const timerRef = useRef(null);
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
    socket.onclose = () => setConnected(false);
    socket.onerror = () => setConnected(false);
    socket.onmessage = (event) => {
      inFlightRef.current = false;
      const payload = JSON.parse(event.data);
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

  async function start(mode) {
    if (runningRef.current) return;
    runningRef.current = true;
    stopCamera();
    setStatus((previous) => ({ ...previous, running: true, eye_state: "Starting", frame: null, local_frame: null, error: null }));
    try {
      const socket = connectSocket();
      await waitForSocket(socket);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 360, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;

      const video = document.createElement("video");
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();
      videoRef.current = video;

      const freshToken = user?.getIdToken ? await user.getIdToken() : token;
      socket.send(JSON.stringify({ event: "start", mode, firebase_token: freshToken || token }));

      timerRef.current = setInterval(() => {
        if (!videoRef.current || socket.readyState !== WebSocket.OPEN || inFlightRef.current) return;
        const videoEl = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = 640;
        canvas.height = 360;
        const context = canvas.getContext("2d");
        context.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        const frame = canvas.toDataURL("image/jpeg", 0.55);
        setStatus((previous) => ({ ...previous, local_frame: frame }));
        inFlightRef.current = true;
        socket.send(JSON.stringify({ event: "frame", frame }));
      }, 120);
    } catch (error) {
      runningRef.current = false;
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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    videoRef.current = null;
  }

  function stop() {
    runningRef.current = false;
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

  return { status, connected, start, stop, changeMode, stopAlarm };
}
