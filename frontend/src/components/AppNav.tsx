"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { motion } from "motion/react";

const MAGNIFY = {
  whileHover: { scale: 1.08 },
  whileTap: { scale: 0.94 },
  transition: { type: "spring" as const, stiffness: 400, damping: 17 },
};

/** The nav bar for signed-in pages (dashboard, person, plan) - a lighter
 * sibling of the landing page's nav. Mission/Features open the landing
 * page's sections in a new tab rather than navigating away from whatever
 * the person is in the middle of. */
export default function AppNav() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-20 border-b border-border bg-paper/80 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
        <motion.div {...MAGNIFY}>
          <Link href="/app" className="font-display text-xl italic tracking-tight text-clay">
            Kindred
          </Link>
        </motion.div>

        <div className="flex items-center gap-5">
          <motion.a
            {...MAGNIFY}
            href="/#mission"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-ink-muted transition-colors hover:text-ink"
          >
            Mission
          </motion.a>
          <motion.a
            {...MAGNIFY}
            href="/#features"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-ink-muted transition-colors hover:text-ink"
          >
            Features
          </motion.a>
          <motion.button
            {...MAGNIFY}
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-sm text-ink-faint transition-colors hover:text-rose"
          >
            Sign out
          </motion.button>
        </div>
      </div>
    </motion.nav>
  );
}
