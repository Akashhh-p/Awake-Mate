import React, { useEffect, useRef } from "react";
import { Camera, Radio } from "lucide-react";
import { motion } from "framer-motion";

function glowClass(status) {
  if (status.eye_state === "Sleeping") return "webcam-sleeping";
  if (status.eye_state === "Drowsy" || status.eye_state === "Eyes Closed") return "webcam-drowsy";
  if (status.eye_state === "Awake") return "webcam-awake";
  return "shadow-violet";
}

export default function WebcamPanel({ status, previewStream }) {
  const videoRef = useRef(null);
  const alarmOn = status.alarm_status === "On";

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = previewStream || null;
  }, [previewStream]);

  return (
    <motion.section initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-xl p-4" aria-labelledby="live-monitoring-title">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="live-monitoring-title" className="text-lg font-semibold text-slate-950">Live Monitoring</h2>
          <p className="text-sm text-slate-500">Webcam glow follows eye state in real time.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-federalBlue" role="status" aria-live="polite">
          <Radio size={15} aria-hidden="true" />
          {status.running ? "Streaming" : "Standby"}
        </div>
      </div>
      <div className={`relative aspect-video overflow-hidden rounded-xl border border-slate-200 bg-slate-950 ${glowClass(status)}`}>
        {previewStream ? (
          <video
            ref={videoRef}
            aria-label={`Live AwakeMate webcam feed. Current state: ${status.eye_state}.`}
            className="h-full w-full scale-x-[-1] object-cover"
            autoPlay
            muted
            playsInline
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-500">
            <Camera size={42} aria-hidden="true" />
            <span>Start monitoring to activate webcam intelligence</span>
          </div>
        )}
        <div className="absolute left-4 top-4 rounded-full bg-black/70 px-3 py-1 text-sm text-white backdrop-blur" aria-live="polite">
          {status.eye_state}
        </div>
        <div className="absolute bottom-4 left-4 right-4 grid gap-2 rounded-xl bg-black/65 p-3 text-xs text-white backdrop-blur sm:grid-cols-4">
          <div>
            <span className="block text-white/70">EAR</span>
            <strong>{status.ear_value || 0}</strong>
          </div>
          <div>
            <span className="block text-white/70">Focus</span>
            <strong>{status.focus_score}/100</strong>
          </div>
          <div>
            <span className="block text-white/70">Alert</span>
            <strong className={alarmOn ? "text-red-200" : ""}>{status.alert_level}</strong>
          </div>
          <div>
            <span className="block text-white/70">Alarm</span>
            <strong className={alarmOn ? "text-red-200" : ""}>{status.alarm_status}</strong>
          </div>
        </div>
        {alarmOn && (
          <div role="alert" className="absolute right-4 top-4 rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-lg">
            Drowsiness alert
          </div>
        )}
      </div>
    </motion.section>
  );
}
