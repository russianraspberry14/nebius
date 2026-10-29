"use client";

import Link from "next/link";
import useSWR from "swr";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/dates";

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
      <ul className="flex flex-col gap-2">
        {unplanned.map((d) => (
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
                  : `in ${d.days_until} days`}{" "}
              &middot; {formatDate(d.date)}
            </p>
            <Link
              href={`/people/${d.person_id}/plan`}
              className="shrink-0 rounded-full border border-border-strong px-3 py-1 text-xs font-medium text-ink-muted transition-colors hover:border-clay hover:text-clay"
            >
              Plan this now
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
