"use client";

import Link from "next/link";
import useSWR from "swr";
import { api } from "@/lib/api";

export default function UpcomingDates() {
  const { data: dates } = useSWR("upcoming-dates", () => api.getUpcomingDates());

  if (!dates || dates.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Upcoming
      </h2>
      <ul className="flex flex-col gap-2">
        {dates.map((d) => (
          <li
            key={d.key_date_id}
            className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-800"
          >
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              <span className="font-medium text-zinc-900 dark:text-zinc-50">
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
                className="shrink-0 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:border-emerald-500 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              >
                Draft ready
              </Link>
            ) : (
              <Link
                href={`/people/${d.person_id}/plan`}
                className="shrink-0 rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:border-zinc-500 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500"
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
