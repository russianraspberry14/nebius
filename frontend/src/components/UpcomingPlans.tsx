"use client";

import Link from "next/link";
import useSWR from "swr";
import { motion } from "motion/react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/dates";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function UpcomingPlans() {
  const { data: plans } = useSWR("upcoming-plans", () => api.getUpcomingPlans());

  if (!plans || plans.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-ink-faint">
        Plans coming up
      </h2>
      <div className="list-group">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: i * 0.06, ease: EASE }}
          >
            <Link
              href={plan.person_ids[0] ? `/people/${plan.person_ids[0]}` : "/app"}
              className="group flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-clay-soft/40"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-display text-base capitalize text-ink">
                  {plan.occasion}
                  {plan.status === "draft" && (
                    <span className="rounded-full bg-sage-soft px-2 py-0.5 text-xs font-sans font-normal normal-case text-sage-ink">
                      draft
                    </span>
                  )}
                </p>
                <p className="truncate text-sm text-ink-muted">
                  {plan.person_names.join(", ")} &middot; {plan.stops.map((s) => s.name).join(" → ")}
                </p>
              </div>
              <span className="shrink-0 text-sm text-ink-muted">{formatDate(plan.date)}</span>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
