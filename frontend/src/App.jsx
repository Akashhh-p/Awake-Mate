import React, { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import Layout from "./components/Layout";
import { useBrowserMonitor } from "./hooks/useBrowserMonitor";
import { useBrowserAlarm } from "./hooks/useBrowserAlarm";
import { auth, firebaseReady } from "./firebase";
import { useFirebaseAuth } from "./hooks/useFirebaseAuth";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import History from "./pages/History";
import Settings from "./pages/Settings";
import About from "./pages/About";
import Help from "./pages/Help";
import Auth from "./pages/Auth";

export default function App() {
  const [page, setPage] = useState("dashboard");
  const { user, token, loading } = useFirebaseAuth();
  const [settings, setSettings] = useState({
    mode: localStorage.getItem("awakemate_mode") || "study",
    emergency_mode: false,
    break_reminder_minutes: 45,
  });
  const monitor = useBrowserMonitor(user, token);
  const { status, connected } = monitor;
  const alarm = useBrowserAlarm(status);
  const emailVerified = user?.email ? user.emailVerified : true;
  const routeAllowed = Boolean(user && emailVerified);

  useEffect(() => {
    localStorage.setItem("awakemate_mode", settings.mode);
  }, [settings.mode]);

  async function handleLogout() {
    alarm?.stopAlarm();
    monitor.stop();
    if (firebaseReady && auth) await signOut(auth);
    setPage("dashboard");
  }

  const pages = {
    dashboard: <Dashboard status={status} settings={settings} setSettings={setSettings} alarm={alarm} monitor={monitor} user={user} />,
    analytics: <Analytics user={user} />,
    history: <History user={user} />,
    settings: <Settings settings={settings} setSettings={setSettings} user={user} onLogout={handleLogout} />,
    help: <Help />,
    about: <About />,
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-8">
        <p role="status" className="glass rounded-xl p-6 font-semibold text-slate-700">Checking authentication...</p>
      </main>
    );
  }

  if (!routeAllowed) {
    return <Auth />;
  }

  return (
    <Layout page={page} setPage={setPage} connected={connected} user={user}>
      {pages[page]}
    </Layout>
  );
}
