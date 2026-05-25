import React from "react";
import { BellOff, Pause, Play, ShieldAlert } from "lucide-react";

const modes = [
  { id: "study", label: "Study", detail: "3s medium alarm, 45m break" },
  { id: "work", label: "Work", detail: "4s soft/medium alarm, inactivity watch" },
  { id: "driving", label: "Driving", detail: "1.5s very loud, no snooze" },
];

export default function ModeControls({ status, settings, setSettings, running, alarm, monitor }) {
  async function handleStart() {
    alarm?.unlockAudio();
    await monitor.start(status.mode || settings.mode);
  }

  async function handleStop() {
    alarm?.stopAlarm();
    monitor.stop();
  }

  async function handleStopAlarm() {
    alarm?.stopAlarm();
    monitor.stopAlarm();
  }

  async function handleMode(mode) {
    setSettings((current) => ({ ...current, mode }));
    monitor.changeMode(mode);
  }

  return (
    <section className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-center gap-3">
        <ShieldAlert className="text-cyanGlow" size={20} />
        <h2 className="font-semibold">Mission Control</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => handleMode(mode.id)}
            className={`rounded-xl border px-4 py-3 text-left transition ${
              status.mode === mode.id
                ? "border-cyan-300/50 bg-cyan-300/10 text-white"
                : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-violet-300/40 hover:text-white"
            }`}
          >
            <span className="block text-sm font-medium">{mode.label}</span>
            <span className="mt-1 block text-xs text-slate-500">{mode.detail}</span>
          </button>
        ))}
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
          Threshold
          <p className="mt-2 text-xl font-semibold text-white">{status.threshold_seconds}s</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
          Alarm
          <p className="mt-2 text-sm text-white">
            {status.alarm_status} · {status.alert_level} · {status.emergency_mode ? "Emergency on" : "Emergency off"}
          </p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <button
          onClick={handleStart}
          disabled={running}
          className="flex items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Play size={18} />
          Start
        </button>
        <button
          onClick={handleStopAlarm}
          disabled={!running || status.alarm_status !== "On" || !status.snooze_allowed}
          className="flex items-center justify-center gap-2 rounded-xl border border-amber-300/35 bg-amber-300/10 px-4 py-3 font-semibold text-amber-100 transition hover:bg-amber-300/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <BellOff size={18} />
          Stop Alarm
        </button>
        <button
          onClick={handleStop}
          disabled={!running}
          className="flex items-center justify-center gap-2 rounded-xl border border-violet-300/35 bg-violet-300/10 px-4 py-3 font-semibold text-violet-100 transition hover:bg-violet-300/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Pause size={18} />
          Stop Session
        </button>
      </div>
      {!status.snooze_allowed && (
        <p className="mt-3 text-xs text-rose-200">Stop Alarm is disabled in Driving Mode.</p>
      )}
    </section>
  );
}
