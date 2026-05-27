import React from "react";
import { motion } from "framer-motion";

export default function StatCard({ icon: Icon, label, value, helper, tone = "cyan" }) {
  const toneClass = tone === "violet" ? "text-libertyRed bg-red-50" : "text-federalBlue bg-blue-50";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
        </div>
        <div className={`rounded-xl p-3 ${toneClass}`} aria-hidden="true">{Icon && <Icon size={20} aria-hidden="true" />}</div>
      </div>
      {helper && <p className="mt-4 text-xs text-slate-500">{helper}</p>}
    </motion.div>
  );
}
