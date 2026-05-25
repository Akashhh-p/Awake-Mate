import React, { useEffect, useState } from "react";
import { fetchSessions } from "../api/client";

export default function History() {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    fetchSessions().then(setSessions).catch(() => setSessions([]));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm uppercase tracking-[0.28em] text-cyanGlow">SQLite records</p>
        <h1 className="mt-2 text-3xl font-semibold">Session History</h1>
      </div>
      <section className="glass overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.04] text-slate-400">
              <tr>
                {["Date", "Start", "End", "Mode", "Duration", "Alerts", "Drowsy", "Focus"].map((header) => (
                  <th key={header} className="px-4 py-3 font-medium">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id} className="border-b border-white/5 text-slate-200">
                  <td className="px-4 py-3">{session.start_time?.slice(0, 10)}</td>
                  <td className="px-4 py-3">{session.start_time}</td>
                  <td className="px-4 py-3">{session.end_time}</td>
                  <td className="px-4 py-3 capitalize">{session.mode}</td>
                  <td className="px-4 py-3">{session.duration}s</td>
                  <td className="px-4 py-3">{session.total_alerts}</td>
                  <td className="px-4 py-3">{session.drowsy_time}s</td>
                  <td className="px-4 py-3">{session.focus_score}/100</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!sessions.length && <div className="p-8 text-slate-400">No saved sessions yet.</div>}
      </section>
    </div>
  );
}
