import React from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function AnalyticsCharts({ sessions }) {
  const data = sessions.map((session, index) => ({ ...session, session: index + 1 }));
  const averageFocus = data.length
    ? Math.round(data.reduce((sum, session) => sum + Number(session.focus_score || 0), 0) / data.length)
    : 0;
  const totalAlerts = data.reduce((sum, session) => sum + Number(session.total_alerts || 0), 0);

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="glass rounded-xl p-5" aria-labelledby="focus-trend-title">
        <h2 id="focus-trend-title" className="mb-4 font-semibold text-slate-950">Focus Score Trend</h2>
        <p className="sr-only">Average focus score is {averageFocus} out of 100 across {data.length} sessions.</p>
        <div className="h-72" role="img" aria-label={`Focus score trend chart. Average focus score is ${averageFocus} out of 100.`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="focus" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1f4e79" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#1f4e79" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.28)" />
              <XAxis dataKey="session" stroke="#64748b" />
              <YAxis domain={[0, 100]} stroke="#64748b" />
              <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", color: "#0f172a" }} />
              <Area dataKey="focus_score" stroke="#1f4e79" fill="url(#focus)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="glass rounded-xl p-5" aria-labelledby="alerts-chart-title">
        <h2 id="alerts-chart-title" className="mb-4 font-semibold text-slate-950">Alerts Per Session</h2>
        <p className="sr-only">Total alerts across the visible sessions is {totalAlerts}.</p>
        <div className="h-72" role="img" aria-label={`Alerts per session chart. Total alerts across visible sessions is ${totalAlerts}.`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.28)" />
              <XAxis dataKey="session" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", color: "#0f172a" }} />
              <Bar dataKey="total_alerts" fill="#dc2626" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
