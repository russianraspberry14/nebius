"use client";

import { Plan } from "@/lib/api";
import { formatDate } from "@/lib/dates";

export default function PlansList({ plans }: { plans: Plan[] }) {
  return (
    <section className="mb-7">
      <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-ink-faint">
        Plan history
      </h2>
      {plans.length === 0 ? (
        <p className="text-sm text-ink-muted">No saved plans yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {plans.map((plan) => (
            <li
              key={plan.id}
              className="rounded-lg border border-border bg-paper-raised p-3.5 shadow-warm"
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
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
