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

export default function Dashboard({ status, settings, setSettings, alarm, monitor, user }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-federalBlue">Real-time AI monitoring</p>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
            Stay sharp with <span className="text-gradient">AwakeMate</span>
          </h1>
          <p className="mt-2 text-sm text-slate-600">Signed in as {user?.displayName || user?.email || user?.phoneNumber}</p>
        </div>
        <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
          Mode: <span className="font-semibold text-slate-950">{status.mode_label}</span>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6" aria-label="Current monitoring statistics">
        <StatCard icon={Eye} label="Eye State" value={status.eye_state} helper={`EAR ${status.ear_value || 0}`} />
        <StatCard icon={Brain} label={status.score_label} value={`${status.focus_score}/100`} helper={`Detector: ${status.detector_backend}`} tone="violet" />
        <StatCard icon={AlarmClock} label="Alerts" value={status.alerts_count} helper={`${status.alert_level} / ${status.alarm_status}`} />
        <StatCard icon={Timer} label="Session" value={formatSeconds(status.session_duration)} helper={`${status.threshold_seconds}s threshold`} tone="violet" />
        <StatCard icon={Activity} label="Awake Time" value={formatSeconds(status.awake_time)} helper={status.face_detected ? "Face detected" : "Face not detected"} />
        <StatCard icon={Zap} label="Drowsy Time" value={formatSeconds(status.drowsy_time)} helper={status.inactivity_detected ? "Long inactivity detected" : "Eyes closed time"} tone="violet" />
      </section>

      {status.error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-libertyRed">
          {status.error}
        </div>
      )}

      {status.break_due && (
        <div role="status" aria-live="polite" className="neon-border rounded-xl bg-blue-50 px-5 py-4 text-federalBlue">
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
