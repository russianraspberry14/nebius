"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ReactNode } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

/** A grand-but-quick cross-fade + depth shift between routes, so moving
 * from the dashboard into a person's page (or back) reads as a single
 * continuous space rather than a hard cut - Apple's "use natural animations
 * to ease transitions" applied at the route level. */
export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 18, scale: 0.985, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: -12, scale: 0.99, filter: "blur(3px)" }}
        transition={{ duration: 0.5, ease: EASE }}
        className="flex min-h-full flex-1 flex-col"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
