import React from "react";
import { Activity, BarChart3, Clock3, Info, LayoutDashboard, Settings } from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "history", label: "History", icon: Clock3 },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "about", label: "About", icon: Info },
];

export default function Layout({ page, setPage, children, connected }) {
  return (
    <div className="min-h-screen lg:flex">
      <aside className="glass sticky top-0 z-20 flex w-full items-center justify-between gap-4 border-b border-white/10 px-4 py-4 lg:h-screen lg:w-72 lg:flex-col lg:items-stretch lg:border-b-0 lg:border-r lg:px-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/12 text-cyanGlow shadow-neon">
              <Activity size={24} />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-wide">AwakeMate</h1>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">AI Focus OS</p>
            </div>
          </div>
        </div>

        <nav className="flex gap-2 overflow-x-auto lg:mt-10 lg:flex-col lg:overflow-visible">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`relative flex min-w-fit items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
                  active ? "text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="active-nav"
                    className="absolute inset-0 rounded-xl bg-cyan-400/10 ring-1 ring-cyan-300/30"
                  />
                )}
                <Icon size={18} className="relative" />
                <span className="relative">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="hidden rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300 lg:block">
          <div className="mb-2 flex items-center justify-between">
            <span>Backend</span>
            <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-successGlow" : "bg-dangerGlow"}`} />
          </div>
          <p className="text-xs leading-5 text-slate-500">
            FastAPI streams real-time drowsiness telemetry through WebSocket.
          </p>
        </div>
      </aside>
      <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
