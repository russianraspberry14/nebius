"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useState } from "react";
import useSWR from "swr";
import { motion } from "motion/react";
import { api, ApiError, PlanOption } from "@/lib/api";
import PlanOptionsBoard from "@/components/plan/PlanOptionsBoard";
import ThinkingIndicator from "@/components/ThinkingIndicator";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function PlanPageClient() {
  const params = useParams<{ id: string }>();
  const personId = Number(params.id);

  const { data: detail } = useSWR(`person-${personId}`, () => api.getPersonDetail(personId));

  const [occasion, setOccasion] = useState("birthday");
  const [date, setDate] = useState("");
  const [area, setArea] = useState("");
  const [budget, setBudget] = useState("");
  const [duration, setDuration] = useState("");

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<PlanOption[] | null>(null);
  // Bumped on every successful generate so PlanOptionsBoard remounts with a
  // clean save/revise state instead of carrying over the previous round's.
  const [generation, setGeneration] = useState(0);
  // The occasion/area/date/budget actually used for the options currently
  // shown, so Save/Revise persist what was generated even if the form
  // fields change afterward.
  const [generatedFor, setGeneratedFor] = useState<{
    occasion: string;
    area: string;
    date: string;
    budget?: string;
  } | null>(null);

  async function handleGenerate(e: FormEvent) {
    e.preventDefault();
    const effectiveArea = area.trim() || detail?.person.home_city || "";
    if (!date || !effectiveArea) return;
    setGenerating(true);
    setError(null);
    setOptions(null);
    try {
      const result = await api.generatePlan({
        person_ids: [personId],
        occasion,
        date,
        area: effectiveArea,
        budget: budget.trim() || undefined,
        duration: duration.trim() || undefined,
      });
      setOptions(result.options);
      setGeneratedFor({ occasion, area: effectiveArea, date, budget: budget.trim() || undefined });
      setGeneration((g) => g + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't generate a plan.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-14">
      <Link
        href={`/people/${personId}`}
        className="text-sm text-ink-muted transition-colors hover:text-clay"
      >
        &larr; Back to {detail?.person.name ?? "profile"}
      </Link>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="mb-7 mt-3 font-display text-3xl italic tracking-tight text-ink"
      >
        Plan an outing
      </motion.h1>

      <motion.form
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
        onSubmit={handleGenerate}
        className="mb-7 flex flex-col gap-4 rounded-lg border border-border bg-paper-raised p-5 shadow-warm"
      >
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm text-ink-muted">
            Occasion
            <input
              className="rounded-md border border-border bg-paper px-3 py-2 text-sm text-ink focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink-muted">
            Date
            <input
              type="date"
              className="rounded-md border border-border bg-paper px-3 py-2 text-sm text-ink focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink-muted">
            Area
            <input
              className="rounded-md border border-border bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
              placeholder={detail?.person.home_city || "Austin, TX"}
              value={area}
              onChange={(e) => setArea(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink-muted">
            Budget
            <input
              className="rounded-md border border-border bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
              placeholder="$, $$, or $$$"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
          </label>
          <label className="col-span-2 flex flex-col gap-1 text-sm text-ink-muted">
            Duration
            <input
              className="rounded-md border border-border bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
              placeholder="e.g. an afternoon, a full day"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={generating}
          className="self-start rounded-md bg-clay px-4 py-2 text-sm font-medium text-clay-ink shadow-warm transition-all hover:bg-clay-hover active:scale-[0.97] disabled:opacity-50"
        >
          {generating ? "Searching and drafting…" : "Generate plan options"}
        </button>
      </motion.form>

      {generating && <ThinkingIndicator label="Searching places, weather, and drafting options..." />}

      {error && (
        <p className="rise-in mb-5 border-l-2 border-rose/50 pl-3 text-sm text-rose-ink">{error}</p>
      )}

      {options && generatedFor && (
        <PlanOptionsBoard
          key={generation}
          personIds={[personId]}
          occasion={generatedFor.occasion}
          date={generatedFor.date}
          area={generatedFor.area}
          budget={generatedFor.budget}
          initialOptions={options}
          facts={detail?.facts ?? []}
        />
      )}
    </div>
  );
}
