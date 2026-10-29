"use client";

import Link from "next/link";
import useSWR from "swr";
import { motion } from "motion/react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/dates";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function UpcomingDates() {
  const { data: dates } = useSWR("upcoming-dates", () => api.getUpcomingDates());

  // Dates that already have a plan show up in "Plans coming up" instead -
  // this section is specifically the ones still needing attention.
  const unplanned = dates?.filter((d) => !d.draft_plan_id) ?? [];

  if (dates === undefined || unplanned.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-ink-faint">
        Start planning for
      </h2>
      <div className="list-group">
        {unplanned.map((d, i) => (
          <motion.div
            key={d.key_date_id}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: i * 0.06, ease: EASE }}
            className="flex items-center justify-between gap-3 px-4 py-3.5"
          >
            <p className="text-sm text-ink-muted">
              <span className="font-display text-base text-ink">
                {d.person_name}&rsquo;s {d.label.toLowerCase()}
              </span>{" "}
              {d.days_until === 0
                ? "is today"
                : d.days_until === 1
                  ? "is tomorrow"
                  : `in ${d.days_until} days`}{" "}
              &middot; {formatDate(d.date)}
            </p>
            <Link
              href={`/people/${d.person_id}/plan`}
              className="shrink-0 rounded-full border border-border-strong px-3 py-1 text-xs font-medium text-ink-muted transition-colors hover:border-clay hover:text-clay"
            >
              Plan this now
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
