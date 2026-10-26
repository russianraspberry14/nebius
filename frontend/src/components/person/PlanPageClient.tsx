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

function ReviseStopForm({
  onSubmit,
  revising,
}: {
  onSubmit: (instruction: string) => void;
  revising: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState("");

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-1 text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        Swap this for something else
      </button>
    );
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-2">
      <input
        className="min-w-48 flex-1 rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
        placeholder="e.g. something cheaper, somewhere quieter"
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        disabled={revising}
      />
      <button
        onClick={() => {
          if (!instruction.trim()) return;
          onSubmit(instruction.trim());
          setOpen(false);
          setInstruction("");
        }}
        disabled={revising || !instruction.trim()}
        className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {revising ? "Revising..." : "Go"}
      </button>
      <button onClick={() => setOpen(false)} className="text-xs text-zinc-400" disabled={revising}>
        Cancel
      </button>
    </div>
  );
}

function OptionCard({
  option,
  facts,
  onSave,
  saving,
  saved,
  onReviseStop,
  revisingStopIndex,
}: {
  option: PlanOption;
  facts: Fact[];
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  onReviseStop: (stopIndex: number, instruction: string) => void;
  revisingStopIndex: number | null;
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
            {!saved && (
              <ReviseStopForm
                onSubmit={(instruction) => onReviseStop(i, instruction)}
                revising={revisingStopIndex === i}
              />
            )}
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
  const [revising, setRevising] = useState<{ optionTitle: string; stopIndex: number } | null>(null);
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

  async function handleReviseStop(optionTitle: string, stopIndex: number, instruction: string) {
    if (!generatedFor || !options) return;
    const optionIndex = options.findIndex((o) => o.title === optionTitle);
    if (optionIndex === -1) return;

    setRevising({ optionTitle, stopIndex });
    setError(null);
    try {
      const newStop = await api.reviseStop({
        person_ids: [personId],
        occasion,
        date: generatedFor.date,
        area: generatedFor.area,
        stops: options[optionIndex].stops,
        stop_index: stopIndex,
        instruction,
        budget: budget.trim() || undefined,
      });
      setOptions((prev) => {
        if (!prev) return prev;
        const updated = [...prev];
        const stops = [...updated[optionIndex].stops];
        stops[stopIndex] = newStop;
        updated[optionIndex] = { ...updated[optionIndex], stops };
        return updated;
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't revise that stop.");
    } finally {
      setRevising(null);
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
              onReviseStop={(stopIndex, instruction) =>
                handleReviseStop(option.title, stopIndex, instruction)
              }
              revisingStopIndex={
                revising?.optionTitle === option.title ? revising.stopIndex : null
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
