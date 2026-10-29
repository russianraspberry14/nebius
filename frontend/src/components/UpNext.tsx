"use client";

import Link from "next/link";
import useSWR from "swr";
import { motion } from "motion/react";
import { api, PlanStop } from "@/lib/api";
import { formatDate } from "@/lib/dates";

const EASE = [0.16, 1, 0.3, 1] as const;

type Row =
  | {
      kind: "plan";
      key: string;
      date: string;
      href: string;
      occasion: string;
      personNames: string[];
      stops: PlanStop[];
      status: string;
    }
  | {
      kind: "date";
      key: string;
      date: string;
      personName: string;
      label: string;
      daysUntil: number;
      planHref: string;
    };

/** One chronological list of everything coming up - a saved or drafted
 * plan reads the same as a key date that still needs one, just with a
 * different row shape, instead of two separate boxed sections for what's
 * really one "what's coming" question. */
export default function UpNext() {
  const { data: plans } = useSWR("upcoming-plans", () => api.getUpcomingPlans());
  const { data: dates } = useSWR("upcoming-dates", () => api.getUpcomingDates());

  if (plans === undefined || dates === undefined) return null;

  const planRows: Row[] = plans.map((p) => ({
    kind: "plan",
    key: `plan-${p.id}`,
    date: p.date,
    href: p.person_ids[0] ? `/people/${p.person_ids[0]}` : "/app",
    occasion: p.occasion,
    personNames: p.person_names,
    stops: p.stops,
    status: p.status,
  }));

  // A date that already has a draft plan shows up via `plans` instead -
  // this only covers the ones still needing one.
  const dateRows: Row[] = dates
    .filter((d) => !d.draft_plan_id)
    .map((d) => ({
      kind: "date",
      key: `date-${d.key_date_id}`,
      date: d.date,
      personName: d.person_name,
      label: d.label,
      daysUntil: d.days_until,
      planHref: `/people/${d.person_id}/plan`,
    }));

  const rows = [...planRows, ...dateRows].sort((a, b) => a.date.localeCompare(b.date));

  if (rows.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-ink-faint">
        Up next
      </h2>
      <div className="list-group">
        {rows.map((row, i) => (
          <motion.div
            key={row.key}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: i * 0.06, ease: EASE }}
          >
            {row.kind === "plan" ? (
              <Link
                href={row.href}
                className="group flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-clay-soft/40"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-display text-base capitalize text-ink">
                    {row.occasion}
                    {row.status === "draft" && (
                      <span className="rounded-full bg-sage-soft px-2 py-0.5 text-xs font-sans font-normal normal-case text-sage-ink">
                        draft
                      </span>
                    )}
                  </p>
                  <p className="truncate text-sm text-ink-muted">
                    {row.personNames.join(", ")}
                    {row.stops.length > 0 ? ` · ${row.stops.map((s) => s.name).join(" → ")}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-sm text-ink-muted">{formatDate(row.date)}</span>
              </Link>
            ) : (
              <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                <p className="text-sm text-ink-muted">
                  <span className="font-display text-base text-ink">
                    {row.personName}&rsquo;s {row.label.toLowerCase()}
                  </span>{" "}
                  {row.daysUntil === 0
                    ? "is today"
                    : row.daysUntil === 1
                      ? "is tomorrow"
                      : `in ${row.daysUntil} days`}{" "}
                  &middot; {formatDate(row.date)}
                </p>
                <Link
                  href={row.planHref}
                  className="shrink-0 rounded-full border border-border-strong px-3 py-1 text-xs font-medium text-ink-muted transition-colors hover:border-clay hover:text-clay"
                >
                  Plan this now
                </Link>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
