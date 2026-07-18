"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: "warning" | "critical" | "muted" | "danger";
};

export default function StatCard({
  label,
  value,
  icon: Icon,
  tone = "muted",
}: StatCardProps) {
  return (
    <motion.div
      className="stat"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: "easeOut" }}
    >
      <div>
        <div className="lbl">{label}</div>
        <motion.div
          className="val"
          key={value}
          initial={{ scale: 0.82, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 380, damping: 24 }}
        >
          {value}
        </motion.div>
      </div>

      {/* Premium gradient icon container */}
      <div className={`stat-icon-wrap ${tone}`}>
        <Icon size={20} strokeWidth={1.75} />
      </div>
    </motion.div>
  );
}