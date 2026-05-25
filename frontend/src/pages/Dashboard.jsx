import React from "react";
import { Activity, AlarmClock, Brain, Eye, Timer, Zap } from "lucide-react";
import ModeControls from "../components/ModeControls";
import StatCard from "../components/StatCard";
import WebcamPanel from "../components/WebcamPanel";

function formatSeconds(value) {
  const seconds = Math.max(0, Math.floor(value || 0));
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

export default function Dashboard({ status, settings, setSettings, alarm, monitor }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-cyanGlow">Real-time AI monitoring</p>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
            Stay sharp with <span className="text-gradient">AwakeMate</span>
          </h1>
        </div>
        <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300">
          Mode: <span className="text-white">{status.mode_label}</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard icon={Eye} label="Eye State" value={status.eye_state} helper={`EAR ${status.ear_value || 0}`} />
        <StatCard icon={Brain} label={status.score_label} value={`${status.focus_score}/100`} helper={`Detector: ${status.detector_backend}`} tone="violet" />
        <StatCard icon={AlarmClock} label="Alerts" value={status.alerts_count} helper={`${status.alert_level} / ${status.alarm_status}`} />
        <StatCard icon={Timer} label="Session" value={formatSeconds(status.session_duration)} helper={`${status.threshold_seconds}s threshold`} tone="violet" />
        <StatCard icon={Activity} label="Awake Time" value={formatSeconds(status.awake_time)} helper={status.face_detected ? "Face detected" : "Face not detected"} />
        <StatCard icon={Zap} label="Drowsy Time" value={formatSeconds(status.drowsy_time)} helper={status.inactivity_detected ? "Long inactivity detected" : "Eyes closed time"} tone="violet" />
      </div>

      {status.error && (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-5 py-4 text-rose-100">
          {status.error}
        </div>
      )}

      {status.break_due && (
        <div className="neon-border rounded-2xl bg-cyan-300/10 px-5 py-4 text-cyan-50">
          Take a short break and drink water.
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.45fr_0.85fr]">
        <WebcamPanel status={status} />
        <ModeControls status={status} settings={settings} setSettings={setSettings} running={status.running} alarm={alarm} monitor={monitor} />
      </div>
    </div>
  );
}
