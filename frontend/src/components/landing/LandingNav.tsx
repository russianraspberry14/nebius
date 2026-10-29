"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "motion/react";

const SECTIONS = [
  { id: "mission", label: "Mission" },
  { id: "how-it-works", label: "How it works" },
  { id: "features", label: "Features" },
];

export default function LandingNav() {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );

    for (const { id } of SECTIONS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <motion.nav
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-20 border-b border-border bg-paper/80 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="text-xs font-medium uppercase tracking-[0.2em] text-clay"
        >
          Kindred
        </button>

        <div className="hidden items-center gap-6 sm:flex">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className={`text-sm transition-colors ${
                active === s.id ? "text-clay" : "text-ink-muted hover:text-ink"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-ink-muted transition-colors hover:text-clay"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-clay px-3.5 py-1.5 text-sm font-medium text-clay-ink shadow-warm transition-all hover:bg-clay-hover active:scale-[0.97]"
          >
            Sign up
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}
