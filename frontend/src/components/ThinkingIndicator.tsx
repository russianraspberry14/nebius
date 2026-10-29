"use client";

import { motion } from "motion/react";

export default function ThinkingIndicator({ label }: { label: string }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.3 }}
      className="mt-3 flex items-center gap-2.5 text-sm text-ink-muted"
    >
      <span className="breathing-orb h-2.5 w-2.5 rounded-full" />
      {label}
    </motion.p>
  );
}
