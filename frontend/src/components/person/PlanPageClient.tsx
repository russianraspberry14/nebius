"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useState } from "react";
import useSWR from "swr";
import { api, ApiError, Fact, PlanOption } from "@/lib/api";
import { CATEGORY_LABEL } from "@/lib/constants";

function CitedFacts({ factIds, facts }: { factIds: number[]; facts: Fact[] }) {
  if (factIds.length === 0) return null;
  const cited = factIds
    .map((id) => facts.find((f) => f.id === id))
    .filter((f): f is Fact => f !== undefined);
  if (cited.length === 0) return null;

  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {cited.map((f) => (
        <span
          key={f.id}
          className="rounded-full border border-zinc-200 px-2 py-0.5 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400"
          title={`${CATEGORY_LABEL[f.category]}: ${f.value}`}
        >
          {f.value}
        </span>
      ))}
    </div>
  );
}

function OptionCard({
  option,
  facts,
  onSave,
  saving,
  saved,
}: {
  option: PlanOption;
  facts: Fact[];
  onSave: () => void;
  saving: boolean;
  saved: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{option.title}</h3>
        <button
          onClick={onSave}
          disabled={saving || saved}
          className="rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {saved ? "Saved" : saving ? "Saving..." : "Save this plan"}
        </button>
      </div>
      <ul className="flex flex-col gap-3">
        {option.stops.map((stop, i) => (
          <li key={i} className="border-l-2 border-zinc-200 pl-3 dark:border-zinc-800">
            <div className="flex flex-wrap items-baseline gap-x-2">
              {stop.url ? (
                <a
                  href={stop.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-zinc-900 underline dark:text-zinc-50"
                >
                  {stop.name}
                </a>
              ) : (
                <span className="font-medium text-zinc-900 dark:text-zinc-50">{stop.name}</span>
              )}
              {stop.time && <span className="text-sm text-zinc-500">{stop.time}</span>}
              {stop.cost_estimate && (
                <span className="text-sm text-zinc-500">{stop.cost_estimate}</span>
              )}
            </div>
            {stop.why && <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">{stop.why}</p>}
            <CitedFacts factIds={stop.cited_fact_ids} facts={facts} />
          </li>
        ))}
      </ul>
    </div>
  );
}

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
  const [savedTitles, setSavedTitles] = useState<Set<string>>(new Set());
  const [savingTitle, setSavingTitle] = useState<string | null>(null);
  // The area/date actually used for the options currently shown, so Save
  // persists what was generated even if the form fields change afterward.
  const [generatedFor, setGeneratedFor] = useState<{ area: string; date: string } | null>(null);

  async function handleGenerate(e: FormEvent) {
    e.preventDefault();
    const effectiveArea = area.trim() || detail?.person.home_city || "";
    if (!date || !effectiveArea) return;
    setGenerating(true);
    setError(null);
    setOptions(null);
    setSavedTitles(new Set());
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
      setGeneratedFor({ area: effectiveArea, date });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't generate a plan.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave(option: PlanOption) {
    if (!generatedFor) return;
    setSavingTitle(option.title);
    try {
      await api.savePlan({
        person_ids: [personId],
        occasion,
        date: generatedFor.date,
        area: generatedFor.area,
        budget: budget.trim() || undefined,
        stops: option.stops,
      });
      setSavedTitles((s) => new Set(s).add(option.title));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save that plan.");
    } finally {
      setSavingTitle(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <Link
        href={`/people/${personId}`}
        className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        &larr; Back to {detail?.person.name ?? "profile"}
      </Link>

      <h1 className="mb-6 mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Plan an outing
      </h1>

      <form onSubmit={handleGenerate} className="mb-6 flex flex-col gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
            Occasion
            <input
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
            Date
            <input
              type="date"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
            Area
            <input
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              placeholder={detail?.person.home_city || "Austin, TX"}
              value={area}
              onChange={(e) => setArea(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
            Budget
            <input
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="$, $$, or $$$"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
          </label>
          <label className="col-span-2 flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
            Duration
            <input
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="e.g. an afternoon, a full day"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={generating}
          className="self-start rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {generating ? "Searching and drafting..." : "Generate plan options"}
        </button>
      </form>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {options && options.length === 0 && (
        <p className="text-sm text-zinc-500">No options came back - try a different area or date.</p>
      )}

      {options && options.length > 0 && (
        <div className="flex flex-col gap-4">
          {options.map((option) => (
            <OptionCard
              key={option.title}
              option={option}
              facts={detail?.facts ?? []}
              onSave={() => handleSave(option)}
              saving={savingTitle === option.title}
              saved={savedTitles.has(option.title)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
