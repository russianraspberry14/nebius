"use client";

import Link from "next/link";
import useSWR from "swr";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/dates";

export default function UpcomingPlans() {
  const { data: plans } = useSWR("upcoming-plans", () => api.getUpcomingPlans());

  if (!plans || plans.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-ink-faint">
        Plans coming up
      </h2>
      <ul className="flex flex-col gap-2">
        {plans.map((plan) => (
          <li key={plan.id}>
            <Link
              href={plan.person_ids[0] ? `/people/${plan.person_ids[0]}` : "/app"}
              className="group flex items-center justify-between gap-3 rounded-lg border border-border bg-paper-raised px-4 py-3 shadow-warm transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-warm-lg"
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
          </li>
        ))}
      </ul>
    </section>
  );
}
