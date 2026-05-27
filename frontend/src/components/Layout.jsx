import React, { useEffect, useState } from "react";
import { Activity, BarChart3, CircleHelp, Clock3, Download, Info, LayoutDashboard, Settings } from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "history", label: "History", icon: Clock3 },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "help", label: "Help", icon: CircleHelp },
  { id: "about", label: "About", icon: Info },
];

export default function Layout({ page, setPage, children, connected, user }) {
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  }

  return (
    <div className="min-h-screen overflow-x-hidden lg:flex">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <aside className="sticky top-0 z-20 flex w-full items-center justify-between gap-4 border-b border-slate-200 bg-federalBlue px-4 py-3 text-white shadow-neon lg:h-screen lg:w-72 lg:flex-col lg:items-stretch lg:border-b-0 lg:border-r-0 lg:px-5 lg:py-4">
        <header>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-federalBlue shadow-neon" aria-hidden="true">
              <Activity size={24} aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-wide">AwakeMate</h1>
              <p className="text-xs uppercase tracking-[0.24em] text-blue-100">Focus Never Blinks</p>
            </div>
          </div>
        </header>

        <nav className="hidden gap-2 lg:mt-10 lg:flex lg:flex-col lg:overflow-visible" aria-label="Primary navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-w-fit items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
                  active ? "text-federalBlue" : "text-blue-100 hover:bg-white/10 hover:text-white"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="active-nav"
                    className="absolute inset-0 rounded-xl bg-white shadow-sm"
                  />
                )}
                <Icon size={18} className="relative" aria-hidden="true" />
                <span className="relative">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="hidden rounded-xl border border-white/15 bg-white/10 p-4 text-sm text-blue-50 lg:block" aria-live="polite">
          <div className="mb-2 flex items-center justify-between">
            <span>{user ? user.displayName || user.email || user.phoneNumber : "Guest mode"}</span>
            <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-successGlow" : "bg-dangerGlow"}`} aria-hidden="true" />
            <span className="sr-only">{connected ? "Monitoring service connected" : "Monitoring service disconnected"}</span>
          </div>
          <p className="text-xs leading-5 text-blue-100">
            <span className="font-serif text-sm italic leading-6 text-white">
              "Stay Focused,Stay Awake,Stay Sharp."
            </span>
          </p>
          {installPrompt && (
            <button
              type="button"
              onClick={installApp}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-federalBlue"
            >
              <Download size={16} aria-hidden="true" />
              Install app
            </button>
          )}
        </div>
      </aside>
      <main id="main-content" tabIndex={-1} className="flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 lg:px-8 lg:pb-8">{children}</main>
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_35px_rgba(15,23,42,0.12)] backdrop-blur lg:hidden"
        aria-label="Mobile navigation"
      >
        {installPrompt && (
          <button
            type="button"
            onClick={installApp}
            className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg bg-federalBlue px-3 py-2 text-sm font-semibold text-white"
          >
            <Download size={16} aria-hidden="true" />
            Install AwakeMate
          </button>
        )}
        <div className="grid grid-cols-6 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-semibold transition ${
                  active ? "bg-blue-50 text-federalBlue" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon size={19} aria-hidden="true" />
                <span className="max-w-full truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
