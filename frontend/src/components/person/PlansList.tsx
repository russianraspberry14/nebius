"use client";

import { motion } from "motion/react";
import { Plan } from "@/lib/api";
import { formatDate } from "@/lib/dates";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function PlansList({ plans }: { plans: Plan[] }) {
  return (
    <section className="mb-7">
      <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-ink-faint">
        Plan history
      </h2>
      {plans.length === 0 ? (
        <p className="text-sm text-ink-muted">No saved plans yet.</p>
      ) : (
        <div className="list-group">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05, ease: EASE }}
              className="px-4 py-3.5"
            >
              <div className="flex items-baseline justify-between">
                <p className="font-display flex items-center gap-2 text-lg capitalize text-ink">
                  {plan.occasion}
                  {plan.status === "draft" && (
                    <span className="rounded-full bg-sage-soft px-2 py-0.5 text-xs font-sans font-normal normal-case text-sage-ink">
                      draft
                    </span>
                  )}
                </p>
                <p className="text-sm text-ink-muted">{formatDate(plan.date)}</p>
              </div>
              <p className="mt-1 text-sm text-ink-muted">
                {plan.stops.map((s) => s.name).join(" → ")}
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}
