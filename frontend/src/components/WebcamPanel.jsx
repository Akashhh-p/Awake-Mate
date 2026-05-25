import React from "react";
import { Camera, Radio } from "lucide-react";
import { motion } from "framer-motion";

function glowClass(status) {
  if (status.eye_state === "Sleeping") return "webcam-sleeping";
  if (status.eye_state === "Drowsy" || status.eye_state === "Eyes Closed") return "webcam-drowsy";
  if (status.eye_state === "Awake") return "webcam-awake";
  return "shadow-violet";
}

export default function WebcamPanel({ status }) {
  return (
    <motion.section initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-2xl p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Live Monitoring</h2>
          <p className="text-sm text-slate-400">Webcam glow follows eye state in real time.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-sm text-cyan-100">
          <Radio size={15} />
          {status.running ? "Streaming" : "Standby"}
        </div>
      </div>
      <div className={`relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-slate-950 ${glowClass(status)}`}>
        {status.frame ? (
          <img src={status.frame} alt="Live AwakeMate webcam feed" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-500">
            <Camera size={42} />
            <span>Start monitoring to activate webcam intelligence</span>
          </div>
        )}
        <div className="absolute left-4 top-4 rounded-full bg-black/45 px-3 py-1 text-sm text-white backdrop-blur">
          {status.eye_state}
        </div>
      </div>
    </motion.section>
  );
}
