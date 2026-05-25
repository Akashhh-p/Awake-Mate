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
  break_due: false,
};

export function useBrowserMonitor() {
  const [status, setStatus] = useState(idleStatus);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const streamRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(document.createElement("canvas"));
  const timerRef = useRef(null);

  function connectSocket() {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      return socketRef.current;
    }
    const socket = new WebSocket(`${WS_BASE}/ws/browser-monitor`);
    socketRef.current = socket;
    socket.onopen = () => setConnected(true);
    socket.onclose = () => setConnected(false);
    socket.onerror = () => setConnected(false);
    socket.onmessage = (event) => {
      setStatus((previous) => ({ ...previous, ...JSON.parse(event.data) }));
    };
    return socket;
  }

  async function start(mode) {
    const socket = connectSocket();
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 960, height: 540, facingMode: "user" },
      audio: false,
    });
    streamRef.current = stream;

    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    await video.play();
    videoRef.current = video;

    const sendStart = () => socket.send(JSON.stringify({ event: "start", mode }));
    if (socket.readyState === WebSocket.OPEN) sendStart();
    else socket.addEventListener("open", sendStart, { once: true });

    timerRef.current = setInterval(() => {
      if (!videoRef.current || socket.readyState !== WebSocket.OPEN) return;
      const videoEl = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = videoEl.videoWidth || 960;
      canvas.height = videoEl.videoHeight || 540;
      const context = canvas.getContext("2d");
      context.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      socket.send(JSON.stringify({ event: "frame", frame: canvas.toDataURL("image/jpeg", 0.72) }));
    }, 160);
  }

  function stopCamera() {
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
    stopCamera();
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
      stopCamera();
      if (socketRef.current) socketRef.current.close();
    };
  }, []);

  return { status, connected, start, stop, changeMode, stopAlarm };
}
