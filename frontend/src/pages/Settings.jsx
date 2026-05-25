import React, { useEffect, useState } from "react";
import { changeMode, fetchModeSettings } from "../api/client";

export default function Settings({ settings, setSettings }) {
  const [modeSettings, setModeSettings] = useState([]);

  useEffect(() => {
    fetchModeSettings().then(setModeSettings).catch(() => setModeSettings([]));
  }, []);

  async function handleMode(mode) {
    setSettings((current) => ({ ...current, mode }));
    await changeMode(mode);
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm uppercase tracking-[0.28em] text-violetGlow">Personalize monitoring</p>
        <h1 className="mt-2 text-3xl font-semibold">Settings</h1>
      </div>
      <section className="glass max-w-4xl rounded-2xl p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm text-slate-300">
            Default mode
            <select
              value={settings.mode}
              onChange={(event) => handleMode(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white"
            >
              <option value="study">Study</option>
              <option value="work">Work</option>
              <option value="driving">Driving</option>
            </select>
          </label>
          <div className="text-sm text-slate-300">
            Settings source
            <p className="mt-2 rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white">SQLite mode_settings table</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {modeSettings.map((item) => (
            <div key={item.mode} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm">
              <p className="capitalize text-white">{item.mode}</p>
              <p className="mt-2 text-slate-400">Threshold: {item.threshold_seconds}s</p>
              <p className="text-slate-400">Alarm: {item.alarm_level}</p>
              <p className="text-slate-400">Break: {item.break_reminder_minutes ? `${item.break_reminder_minutes}m` : "None"}</p>
              <p className="text-slate-400">Snooze: {item.snooze_allowed ? "Allowed" : "Blocked"}</p>
              <p className="text-slate-400">Emergency: {item.emergency_mode ? "On" : "Off"}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
