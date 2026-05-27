import React, { useEffect, useState } from "react";
import { BellOff, BookOpen, BriefcaseBusiness, Car, Pause, Play, Save, ShieldAlert } from "lucide-react";
import { fetchModeSettings, saveModeSettings } from "../api/client";

const modes = [
  {
    id: "study",
    label: "Study",
    icon: BookOpen,
    detail: "Structured focus sessions with healthy break reminders.",
  },
  {
    id: "work",
    label: "Work",
    icon: BriefcaseBusiness,
    detail: "A calmer desk mode for long meetings, coding, and analysis.",
  },
  {
    id: "driving",
    label: "Driving",
    icon: Car,
    detail: "Fast, high-priority fatigue alerts for driving prototypes.",
  },
];

const defaultModeSettings = {
  study: { mode: "study", threshold_seconds: 3, alarm_level: "medium", break_reminder_minutes: 45, snooze_allowed: true, emergency_mode: false },
  work: { mode: "work", threshold_seconds: 4, alarm_level: "soft", break_reminder_minutes: 60, snooze_allowed: true, emergency_mode: false },
  driving: { mode: "driving", threshold_seconds: 1.5, alarm_level: "very_loud", break_reminder_minutes: 0, snooze_allowed: false, emergency_mode: true },
};

export default function ModeControls({ status, settings, setSettings, running, alarm, monitor }) {
  const activeMode = modes.find((mode) => mode.id === (status.mode || settings.mode)) || modes[0];
  const ActiveIcon = activeMode.icon;
  const [modeSettings, setModeSettings] = useState(defaultModeSettings);
  const [saving, setSaving] = useState(false);
  const [sessionBusy, setSessionBusy] = useState(false);
  const activeSettings = modeSettings[activeMode.id] || defaultModeSettings[activeMode.id];

  useEffect(() => {
    fetchModeSettings()
      .then((items) => {
        const next = { ...defaultModeSettings };
        items.forEach((item) => {
          next[item.mode] = item;
        });
        setModeSettings(next);
      })
      .catch(() => {});
  }, []);

  async function handleStart() {
    setSessionBusy(true);
    try {
      await alarm?.unlockAudio();
      await monitor.start(status.mode || settings.mode);
    } finally {
      setSessionBusy(false);
    }
  }

  async function handleStop() {
    setSessionBusy(true);
    alarm?.stopAlarm();
    monitor.stop();
    window.setTimeout(() => setSessionBusy(false), 350);
  }

  async function handleStopAlarm() {
    alarm?.stopAlarm();
    monitor.stopAlarm();
  }

  async function handleMode(mode) {
    setSettings((current) => ({ ...current, mode }));
    monitor.changeMode(mode);
  }

  function updateActiveSetting(key, value) {
    setModeSettings((current) => ({
      ...current,
      [activeMode.id]: { ...current[activeMode.id], [key]: value },
    }));
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function handleSaveSettings() {
    setSaving(true);
    try {
      await saveModeSettings(activeSettings);
      monitor.changeMode(activeMode.id);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="glass rounded-xl p-5" aria-labelledby="mode-control-title">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ShieldAlert className="text-federalBlue" size={20} aria-hidden="true" />
          <h2 id="mode-control-title" className="font-semibold text-slate-950">Mode Control</h2>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600" role="status" aria-live="polite">
          {sessionBusy ? "Working" : running ? "Active" : "Standby"}
        </span>
      </div>

      <div className="grid rounded-xl border border-slate-200 bg-slate-100 p-1 sm:grid-cols-3" role="tablist" aria-label="Monitoring modes">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const active = activeMode.id === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => handleMode(mode.id)}
              role="tab"
              aria-selected={active}
              className={`flex min-h-14 items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold transition ${
                active
                  ? "bg-white text-federalBlue shadow-sm"
                  : "text-slate-500 hover:bg-white/60 hover:text-slate-900"
              }`}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{mode.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-federalBlue">
            <ActiveIcon size={22} aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-950">{activeMode.label} Mode</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">{activeMode.detail}</p>
          </div>
        </div>
        <fieldset className="mt-4 grid gap-3 sm:grid-cols-3">
          <legend className="sr-only">{activeMode.label} mode settings</legend>
          <label className="text-sm font-medium text-slate-600">
            Threshold seconds
            <input
              type="number"
              min="0.5"
              max="30"
              step="0.5"
              value={activeSettings.threshold_seconds}
              onChange={(event) => updateActiveSetting("threshold_seconds", Number(event.target.value))}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-950"
            />
          </label>
          <label className="text-sm font-medium text-slate-600">
            Alarm type
            <select
              value={activeSettings.alarm_level}
              onChange={(event) => updateActiveSetting("alarm_level", event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-950"
            >
              <option value="low">Low</option>
              <option value="soft">Soft</option>
              <option value="medium">Medium</option>
              <option value="very_loud">Very loud</option>
              <option value="continuous">Continuous</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-600">
            Break rhythm minutes
            <input
              type="number"
              min="0"
              max="240"
              step="5"
              value={activeSettings.break_reminder_minutes}
              onChange={(event) => updateActiveSetting("break_reminder_minutes", Number(event.target.value))}
              className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-950"
            />
          </label>
        </fieldset>
        <fieldset className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <legend className="sr-only">Alarm permissions</legend>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={activeSettings.snooze_allowed}
              onChange={(event) => updateActiveSetting("snooze_allowed", event.target.checked)}
              className="h-4 w-4 accent-federalBlue"
            />
            Stop alarm allowed
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={activeSettings.emergency_mode}
              onChange={(event) => updateActiveSetting("emergency_mode", event.target.checked)}
              className="h-4 w-4 accent-federalBlue"
            />
            Emergency volume
          </label>
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="flex items-center justify-center gap-2 rounded-lg bg-federalBlue px-4 py-2 text-sm font-semibold text-white transition hover:bg-patriotBlue disabled:opacity-60"
          >
            <Save size={16} />
            {saving ? "Saving" : "Save"}
          </button>
        </fieldset>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          Threshold
          <p className="mt-2 text-xl font-semibold text-slate-950">{status.threshold_seconds}s</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          Alarm
          <p className="mt-2 text-sm font-medium text-slate-950">
            {status.alarm_status} / {status.alert_level} / {status.emergency_mode ? "Emergency on" : "Emergency off"}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <button
          onClick={handleStart}
          disabled={running || sessionBusy}
          className="flex items-center justify-center gap-2 rounded-xl bg-federalBlue px-4 py-3 font-semibold text-white transition hover:bg-patriotBlue disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Play size={18} aria-hidden="true" />
          {sessionBusy && !running ? "Starting" : "Start"}
        </button>
        <button
          onClick={handleStopAlarm}
          disabled={!running || status.alarm_status !== "On" || !status.snooze_allowed}
          className="flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 font-semibold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <BellOff size={18} aria-hidden="true" />
          Stop Alarm
        </button>
        <button
          onClick={handleStop}
          disabled={!running || sessionBusy}
          className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-semibold text-libertyRed transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Pause size={18} aria-hidden="true" />
          {sessionBusy && running ? "Stopping" : "Stop Session"}
        </button>
      </div>
      {!status.snooze_allowed && (
        <p className="mt-3 text-xs font-medium text-libertyRed">Stop Alarm is disabled in Driving Mode.</p>
      )}
    </section>
  );
}
