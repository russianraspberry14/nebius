"use client";

import Link from "next/link";
import { motion } from "motion/react";

const EASE = [0.16, 1, 0.3, 1] as const;

const CHIPS = [
  { label: "wants to try pottery", color: "bg-amber-soft text-amber-ink border-amber/30", x: "6%", y: "12%", delay: 0.6, float: 5.5 },
  { label: "hates loud bars", color: "bg-rose-soft text-rose-ink border-rose/30", x: "62%", y: "4%", delay: 0.9, float: 6.5 },
  { label: "loves matcha", color: "bg-sage-soft text-sage-ink border-sage/30", x: "2%", y: "62%", delay: 1.1, float: 7 },
  { label: "vegetarian", color: "bg-clay-soft text-clay-hover border-clay/30", x: "70%", y: "70%", delay: 0.75, float: 5 },
  { label: "see live jazz", color: "bg-plum-soft text-plum-ink border-plum/30", x: "38%", y: "84%", delay: 1.3, float: 6 },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pb-28 pt-20 sm:pt-28">
      <div className="pointer-events-none absolute inset-0 hidden sm:block">
        {CHIPS.map((chip) => (
          <motion.span
            key={chip.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: [0, -10, 0],
            }}
            transition={{
              opacity: { duration: 0.6, delay: chip.delay, ease: EASE },
              scale: { duration: 0.6, delay: chip.delay, ease: EASE },
              y: { duration: chip.float, delay: chip.delay, repeat: Infinity, ease: "easeInOut" },
            }}
            style={{ left: chip.x, top: chip.y }}
            className={`absolute rounded-full border px-3 py-1 text-xs font-medium shadow-warm ${chip.color}`}
          >
            {chip.label}
          </motion.span>
        ))}
      </div>

      <div className="relative mx-auto flex max-w-2xl flex-col items-center text-center">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-clay"
        >
          A private notebook
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
          className="font-display text-5xl italic leading-[1.1] tracking-tight text-ink sm:text-6xl"
        >
          For the things that{" "}
          <span className="not-italic text-clay">slip away</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: EASE }}
          className="mt-6 max-w-md text-base text-ink-muted"
        >
          For when your attention moves faster than your memory. Say what you heard
          the moment you hear it &mdash; by voice, no typing required &mdash; and
          Kindred turns it into a plan when the date actually arrives.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease: EASE }}
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            href="/signup"
            className="rounded-md bg-clay px-6 py-3 text-sm font-medium text-clay-ink shadow-warm-lg transition-all hover:bg-clay-hover active:scale-[0.97]"
          >
            Get started free
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-border-strong px-6 py-3 text-sm font-medium text-ink transition-all hover:border-clay hover:text-clay active:scale-[0.97]"
          >
            Log in
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
