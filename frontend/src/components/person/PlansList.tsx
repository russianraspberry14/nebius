"use client";

import { Plan } from "@/lib/api";

export default function PlansList({ plans }: { plans: Plan[] }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Plan history
      </h2>
      {plans.length === 0 ? (
        <p className="text-sm text-zinc-500">No saved plans yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {plans.map((plan) => (
            <li key={plan.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
              <div className="flex items-baseline justify-between">
                <p className="font-medium capitalize text-zinc-900 dark:text-zinc-50">
                  {plan.occasion}
                </p>
                <p className="text-sm text-zinc-500">{plan.date}</p>
              </div>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {plan.stops.map((s) => s.name).join(" → ")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
