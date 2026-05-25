import React from "react";
import { motion } from "framer-motion";

export default function StatCard({ icon: Icon, label, value, helper, tone = "cyan" }) {
  const toneClass = tone === "violet" ? "text-violetGlow bg-violet-400/10" : "text-cyanGlow bg-cyan-400/10";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
        </div>
        <div className={`rounded-xl p-3 ${toneClass}`}>{Icon && <Icon size={20} />}</div>
      </div>
      {helper && <p className="mt-4 text-xs text-slate-500">{helper}</p>}
    </motion.div>
  );
}
