import React, { useEffect, useState } from "react";
import { fetchSessions } from "../api/client";

export default function History({ user }) {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    fetchSessions().then(setSessions).catch(() => setSessions([]));
  }, [user?.uid]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm uppercase tracking-[0.28em] text-federalBlue">{user ? `${user.displayName || user.email || "Your"} SQLite records` : "SQLite records"}</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Session History</h1>
      </div>
      <section className="glass overflow-hidden rounded-xl" aria-labelledby="history-title">
        <div className="grid gap-3 p-4 md:hidden">
          <h2 id="history-title" className="sr-only">Saved monitoring sessions for the signed-in account</h2>
          {sessions.map((session) => (
            <article key={session.id} className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold capitalize text-slate-950">{session.mode}</h3>
                <span className="text-xs text-slate-500">{session.start_time?.slice(0, 10)}</span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-xs text-slate-500">Duration</dt>
                  <dd className="font-semibold">{session.duration}s</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Focus</dt>
                  <dd className="font-semibold">{session.focus_score}/100</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Alerts</dt>
                  <dd className="font-semibold">{session.total_alerts}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Drowsy</dt>
                  <dd className="font-semibold">{session.drowsy_time}s</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[760px] text-left text-sm">
            <caption className="sr-only">Saved monitoring sessions for the signed-in account</caption>
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                {["Date", "Start", "End", "Mode", "Duration", "Alerts", "Drowsy", "Focus"].map((header) => (
                  <th key={header} scope="col" className="px-4 py-3 font-medium">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id} className="border-b border-slate-100 text-slate-700">
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
        {!sessions.length && <div className="p-8 text-slate-500">No saved sessions yet.</div>}
      </section>
    </div>
  );
}
