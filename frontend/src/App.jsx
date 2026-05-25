import React, { useState } from "react";
import Layout from "./components/Layout";
import { useBrowserMonitor } from "./hooks/useBrowserMonitor";
import { useBrowserAlarm } from "./hooks/useBrowserAlarm";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import History from "./pages/History";
import Settings from "./pages/Settings";
import About from "./pages/About";

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [settings, setSettings] = useState({
    mode: "study",
    emergency_mode: false,
    break_reminder_minutes: 45,
  });
  const monitor = useBrowserMonitor();
  const { status, connected } = monitor;
  const alarm = useBrowserAlarm(status);

  const pages = {
    dashboard: <Dashboard status={status} settings={settings} setSettings={setSettings} alarm={alarm} monitor={monitor} />,
    analytics: <Analytics />,
    history: <History />,
    settings: <Settings settings={settings} setSettings={setSettings} />,
    about: <About />,
  };

  return (
    <Layout page={page} setPage={setPage} connected={connected}>
      {pages[page]}
    </Layout>
  );
}
