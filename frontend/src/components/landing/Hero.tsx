"use client";

import Link from "next/link";
import { motion } from "motion/react";

const EASE = [0.16, 1, 0.3, 1] as const;

// Each chip wanders a loose, irregular loop (not a simple up-down bob) via
// a plain CSS keyframe animation (cloud-float-N, defined in globals.css) -
// not Motion's `animate`, since an infinite keyframe-array transform tween
// never actually ran here. Its border-radius is lopsided per corner and
// lazily morphs along with the drift, so it reads as a cloud, not a pill.
const CHIPS = [
  {
    label: "wants to try pottery",
    color: "bg-amber-soft text-amber-ink border-amber/30",
    x: "6%",
    y: "12%",
    delay: 0.6,
    floatClass: "cloud-float-1",
  },
  {
    label: "hates loud bars",
    color: "bg-rose-soft text-rose-ink border-rose/30",
    x: "62%",
    y: "4%",
    delay: 0.9,
    floatClass: "cloud-float-2",
  },
  {
    label: "loves matcha",
    color: "bg-sage-soft text-sage-ink border-sage/30",
    x: "2%",
    y: "62%",
    delay: 1.1,
    floatClass: "cloud-float-3",
  },
  {
    label: "vegetarian",
    color: "bg-clay-soft text-clay-hover border-clay/30",
    x: "70%",
    y: "70%",
    delay: 0.75,
    floatClass: "cloud-float-4",
  },
  {
    label: "see live jazz",
    color: "bg-plum-soft text-plum-ink border-plum/30",
    x: "38%",
    y: "84%",
    delay: 1.3,
    floatClass: "cloud-float-5",
  },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pb-28 pt-20 sm:pt-28">
      <div className="pointer-events-none absolute inset-0 hidden sm:block">
        {CHIPS.map((chip) => (
          <motion.div
            key={chip.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: chip.delay, ease: EASE }}
            style={{ left: chip.x, top: chip.y }}
            className="absolute"
          >
            <span
              style={{ animationDelay: `${chip.delay}s` }}
              className={`block border px-4 py-2.5 text-xs font-medium shadow-warm ${chip.color} ${chip.floatClass}`}
            >
              {chip.label}
            </span>
          </motion.div>
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
          (what makes them laugh, what they&rsquo;ve been hoping to try) are
          the first things to go. You already love your people. Kindred
          makes sure it shows.
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
