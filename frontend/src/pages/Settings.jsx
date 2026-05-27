import React, { useEffect, useState } from "react";
import { LogOut, Save } from "lucide-react";
import { changeMode, fetchModeSettings, saveModeSettings } from "../api/client";

export default function Settings({ settings, setSettings, user, onLogout }) {
  const [modeSettings, setModeSettings] = useState([]);
  const [savingMode, setSavingMode] = useState("");

  useEffect(() => {
    fetchModeSettings().then(setModeSettings).catch(() => setModeSettings([]));
  }, []);

  async function handleMode(mode) {
    setSettings((current) => ({ ...current, mode }));
    await changeMode(mode);
  }

  function updateModeSetting(mode, key, value) {
    setModeSettings((items) => items.map((item) => (item.mode === mode ? { ...item, [key]: value } : item)));
  }

  async function handleSave(item) {
    setSavingMode(item.mode);
    try {
      await saveModeSettings(item);
      if (item.mode === settings.mode) await changeMode(item.mode);
    } finally {
      setSavingMode("");
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm uppercase tracking-[0.28em] text-libertyRed">Personalize monitoring</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Settings</h1>
      </div>
      <section className="glass max-w-4xl rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Signed in as</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">{user?.displayName || user?.email || user?.phoneNumber}</h2>
            <p className="text-sm text-slate-600">{user?.email || user?.phoneNumber}</p>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-semibold text-libertyRed transition hover:bg-red-100"
          >
            <LogOut size={18} aria-hidden="true" />
            Logout
          </button>
        </div>
      </section>
      <section className="glass max-w-4xl rounded-xl p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <label htmlFor="default-mode" className="text-sm text-slate-600">
            Default mode
            <select
              id="default-mode"
              value={settings.mode}
              onChange={(event) => handleMode(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-950"
            >
              <option value="study">Study</option>
              <option value="work">Work</option>
              <option value="driving">Driving</option>
            </select>
          </label>
          <div className="text-sm text-slate-600">
            Settings source
            <p className="mt-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-950">SQLite mode_settings table</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {modeSettings.map((item) => (
            <div key={item.mode} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <p className="capitalize font-semibold text-slate-950">{item.mode}</p>
              <label htmlFor={`${item.mode}-threshold`} className="mt-3 block text-slate-600">
                Threshold seconds
                <input
                  id={`${item.mode}-threshold`}
                  type="number"
                  min="0.5"
                  max="30"
                  step="0.5"
                  value={item.threshold_seconds}
                  onChange={(event) => updateModeSetting(item.mode, "threshold_seconds", Number(event.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-950"
                />
              </label>
              <label htmlFor={`${item.mode}-alarm`} className="mt-3 block text-slate-600">
                Alarm type
                <select
                  id={`${item.mode}-alarm`}
                  value={item.alarm_level}
                  onChange={(event) => updateModeSetting(item.mode, "alarm_level", event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-950"
                >
                  <option value="low">Low</option>
                  <option value="soft">Soft</option>
                  <option value="medium">Medium</option>
                  <option value="very_loud">Very loud</option>
                  <option value="continuous">Continuous</option>
                </select>
              </label>
              <label htmlFor={`${item.mode}-break`} className="mt-3 block text-slate-600">
                Break rhythm minutes
                <input
                  id={`${item.mode}-break`}
                  type="number"
                  min="0"
                  max="240"
                  step="5"
                  value={item.break_reminder_minutes}
                  onChange={(event) => updateModeSetting(item.mode, "break_reminder_minutes", Number(event.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-950"
                />
              </label>
              <label className="mt-3 flex items-center gap-2 text-slate-700">
                <input
                  type="checkbox"
                  checked={item.snooze_allowed}
                  onChange={(event) => updateModeSetting(item.mode, "snooze_allowed", event.target.checked)}
                  className="h-4 w-4 accent-federalBlue"
                />
                Stop alarm allowed
              </label>
              <label className="mt-2 flex items-center gap-2 text-slate-700">
                <input
                  type="checkbox"
                  checked={item.emergency_mode}
                  onChange={(event) => updateModeSetting(item.mode, "emergency_mode", event.target.checked)}
                  className="h-4 w-4 accent-federalBlue"
                />
                Emergency volume
              </label>
              <button
                onClick={() => handleSave(item)}
                disabled={savingMode === item.mode}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-federalBlue px-3 py-2 font-semibold text-white transition hover:bg-patriotBlue disabled:opacity-60"
              >
                <Save size={16} aria-hidden="true" />
                {savingMode === item.mode ? "Saving" : "Save"}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
