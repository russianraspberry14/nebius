"use client";

import Link from "next/link";
import { motion } from "motion/react";

const EASE = [0.16, 1, 0.3, 1] as const;

// Each chip wanders a loose, irregular loop (not a simple up-down bob) and
// its border-radius is lopsided per corner and lazily morphs over time, so
// it reads as a drifting cloud rather than a pill.
const CHIPS = [
  {
    label: "wants to try pottery",
    color: "bg-amber-soft text-amber-ink border-amber/30",
    x: "6%",
    y: "12%",
    delay: 0.6,
    duration: 13,
    driftX: [0, 22, -10, 14, 0],
    driftY: [0, -16, 10, -8, 0],
    radii: ["62% 38% 55% 45% / 48% 60% 40% 52%", "45% 55% 40% 60% / 60% 42% 58% 40%", "62% 38% 55% 45% / 48% 60% 40% 52%"],
  },
  {
    label: "hates loud bars",
    color: "bg-rose-soft text-rose-ink border-rose/30",
    x: "62%",
    y: "4%",
    delay: 0.9,
    duration: 15,
    driftX: [0, -18, 12, -6, 0],
    driftY: [0, 14, -10, 8, 0],
    radii: ["40% 60% 45% 55% / 55% 45% 60% 40%", "58% 42% 60% 40% / 42% 58% 38% 62%", "40% 60% 45% 55% / 55% 45% 60% 40%"],
  },
  {
    label: "loves matcha",
    color: "bg-sage-soft text-sage-ink border-sage/30",
    x: "2%",
    y: "62%",
    delay: 1.1,
    duration: 16.5,
    driftX: [0, 16, -14, 8, 0],
    driftY: [0, -12, 16, -6, 0],
    radii: ["55% 45% 62% 38% / 40% 55% 45% 60%", "42% 58% 38% 62% / 58% 42% 60% 40%", "55% 45% 62% 38% / 40% 55% 45% 60%"],
  },
  {
    label: "vegetarian",
    color: "bg-clay-soft text-clay-hover border-clay/30",
    x: "70%",
    y: "70%",
    delay: 0.75,
    duration: 12.5,
    driftX: [0, -14, 18, -10, 0],
    driftY: [0, 10, -14, 6, 0],
    radii: ["48% 52% 40% 60% / 60% 40% 55% 45%", "60% 40% 58% 42% / 45% 60% 38% 62%", "48% 52% 40% 60% / 60% 40% 55% 45%"],
  },
  {
    label: "see live jazz",
    color: "bg-plum-soft text-plum-ink border-plum/30",
    x: "38%",
    y: "84%",
    delay: 1.3,
    duration: 14,
    driftX: [0, 12, -16, 9, 0],
    driftY: [0, -10, 12, -14, 0],
    radii: ["58% 42% 48% 52% / 42% 58% 45% 55%", "40% 60% 55% 45% / 60% 40% 58% 42%", "58% 42% 48% 52% / 42% 58% 45% 55%"],
  },
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
              x: chip.driftX,
              y: chip.driftY,
              borderRadius: chip.radii,
            }}
            transition={{
              opacity: { duration: 0.6, delay: chip.delay, ease: EASE },
              scale: { duration: 0.6, delay: chip.delay, ease: EASE },
              x: { duration: chip.duration, delay: chip.delay, repeat: Infinity, ease: "easeInOut" },
              y: { duration: chip.duration, delay: chip.delay, repeat: Infinity, ease: "easeInOut" },
              borderRadius: {
                duration: chip.duration,
                delay: chip.delay,
                repeat: Infinity,
                ease: "easeInOut",
              },
            }}
            style={{ left: chip.x, top: chip.y }}
            className={`absolute border px-3 py-1.5 text-xs font-medium shadow-warm ${chip.color}`}
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
          A smart planner
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
          The world moves fast, and the small things you learn about someone
          &mdash; what makes them laugh, what they&rsquo;ve been hoping to
          try &mdash; are the first things to go. You already love your
          people. Kindred makes sure it shows.
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
