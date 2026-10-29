"use client";

import Link from "next/link";
import useSWR from "swr";
import { api } from "@/lib/api";

export default function UpcomingDates() {
  const { data: dates } = useSWR("upcoming-dates", () => api.getUpcomingDates());

  if (!dates || dates.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-ink-faint">
        Upcoming
      </h2>
      <ul className="flex flex-col gap-2">
        {dates.map((d) => (
          <li
            key={d.key_date_id}
            className="flex items-center justify-between rounded-lg border border-border bg-paper-raised px-4 py-3 shadow-warm"
          >
            <p className="text-sm text-ink-muted">
              <span className="font-display text-base text-ink">
                {d.person_name}&rsquo;s {d.label.toLowerCase()}
              </span>{" "}
              {d.days_until === 0
                ? "is today"
                : d.days_until === 1
                  ? "is tomorrow"
                  : `in ${d.days_until} days`}
            </p>
            {d.draft_plan_id ? (
              <Link
                href={`/people/${d.person_id}`}
                className="shrink-0 rounded-full border border-sage/40 bg-sage-soft px-3 py-1 text-xs font-medium text-sage-ink transition-colors hover:border-sage"
              >
                Draft ready
              </Link>
            ) : (
              <Link
                href={`/people/${d.person_id}/plan`}
                className="shrink-0 rounded-full border border-border-strong px-3 py-1 text-xs font-medium text-ink-muted transition-colors hover:border-clay hover:text-clay"
              >
                Plan this now
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
