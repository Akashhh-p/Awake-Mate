import axios from "axios";

const LOCAL_API_BASE = "http://127.0.0.1:8020";
const PRODUCTION_API_BASE = "https://awakemate-backend.onrender.com";

function resolveApiBase() {
  const configuredBase = import.meta.env.VITE_API_BASE?.trim();
  const isPlaceholder =
    !configuredBase ||
    configuredBase.includes("your-render-backend-url") ||
    configuredBase.includes("your-backend-service");

  if (!isPlaceholder) return configuredBase.replace(/\/$/, "");

  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return LOCAL_API_BASE;
  }

  return PRODUCTION_API_BASE;
}

export const API_BASE = resolveApiBase();
export const WS_BASE = API_BASE.replace(/^http/, "ws");

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 8000,
});

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

export async function fetchStatus() {
  const { data } = await api.get("/status");
  return data;
}

export async function startMonitor(mode, firebaseToken = null) {
  const { data } = await api.post("/start-session", { mode, firebase_token: firebaseToken });
  return data;
}

export async function stopMonitor() {
  const { data } = await api.post("/stop-session");
  return data;
}

export async function stopAlarm() {
  const { data } = await api.post("/stop-alarm");
  return data;
}

export async function changeMode(mode) {
  const { data } = await api.post("/change-mode", { mode });
  return data;
}

export async function fetchSessions() {
  const { data } = await api.get("/session-history");
  return data;
}

export async function fetchAnalytics() {
  const { data } = await api.get("/analytics");
  return data;
}

export async function fetchModeSettings() {
  const { data } = await api.get("/mode-settings");
  return data;
}

export async function saveModeSettings(settings) {
  const { data } = await api.put("/mode-settings", settings);
  return data;
}
