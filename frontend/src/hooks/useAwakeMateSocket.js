import React, { useEffect, useRef, useState } from "react";
import { fetchStatus, WS_BASE } from "../api/client";

const idleStatus = {
  running: false,
  mode: "study",
  mode_label: "Study",
  eye_state: "Connecting",
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

export function useAwakeMateSocket() {
  const [status, setStatus] = useState(idleStatus);
  const [connected, setConnected] = useState(false);
  const reconnectTimer = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    let active = true;

    function connect() {
      fetchStatus().then((payload) => {
        if (active) setStatus((previous) => ({ ...previous, ...payload }));
      }).catch(() => {});

      const socket = new WebSocket(`${WS_BASE}/ws/monitor`);
      socketRef.current = socket;

      socket.onopen = () => setConnected(true);
      socket.onmessage = (event) => {
        const payload = JSON.parse(event.data);
        setStatus((previous) => ({ ...previous, ...payload }));
      };
      socket.onerror = () => {
        setConnected(false);
        socket.close();
      };
      socket.onclose = () => {
        setConnected(false);
        if (active) {
          reconnectTimer.current = setTimeout(connect, 1000);
        }
      };
    }

    connect();

    return () => {
      active = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (socketRef.current) socketRef.current.close();
    };
  }, []);

  return { status, connected };
}
