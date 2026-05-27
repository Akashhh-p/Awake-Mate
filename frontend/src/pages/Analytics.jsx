import React, { useEffect, useState } from "react";
import AnalyticsCharts from "../components/AnalyticsCharts";
import { fetchAnalytics } from "../api/client";

export default function Analytics({ user }) {
  const [analytics, setAnalytics] = useState({ sessions: [], alerts: [], total_sessions: 0, total_alerts: 0, average_focus_score: 100 });

  useEffect(() => {
    fetchAnalytics().then(setAnalytics).catch(() => {});
  }, [user?.uid]);

  const sessions = analytics.sessions || [];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm uppercase tracking-[0.28em] text-libertyRed">{user ? `${user.displayName || user.email || "Your"} session intelligence` : "Session intelligence"}</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Analytics</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass rounded-xl p-5">
          <p className="text-sm text-slate-500">Total Sessions</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{analytics.total_sessions}</p>
        </div>
        <div className="glass rounded-xl p-5">
          <p className="text-sm text-slate-500">Average Focus</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{analytics.average_focus_score}/100</p>
        </div>
        <div className="glass rounded-xl p-5">
          <p className="text-sm text-slate-500">Total Alerts</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{analytics.total_alerts}</p>
        </div>
      </div>
      {sessions.length ? <AnalyticsCharts sessions={sessions} /> : <div className="glass rounded-xl p-8 text-slate-500">No analytics yet. Complete a monitoring session first.</div>}
    </div>
  );
}
