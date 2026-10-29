"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useState } from "react";
import useSWR from "swr";
import { motion } from "motion/react";
import { api, ApiError, Fact, PlanOption } from "@/lib/api";
import { CATEGORY_LABEL } from "@/lib/constants";

const EASE = [0.16, 1, 0.3, 1] as const;

function CitedFacts({ factIds, facts }: { factIds: number[]; facts: Fact[] }) {
  if (factIds.length === 0) return null;
  const cited = factIds
    .map((id) => facts.find((f) => f.id === id))
    .filter((f): f is Fact => f !== undefined);
  if (cited.length === 0) return null;

  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {cited.map((f) => (
        <span
          key={f.id}
          className="rounded-full border border-clay/25 bg-clay-soft px-2 py-0.5 text-xs text-clay-hover"
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
        className="mt-1.5 text-xs font-medium text-ink-faint transition-colors hover:text-clay"
      >
        Swap this for something else
      </button>
    );
  }

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2">
      <input
        className="min-w-48 flex-1 rounded border border-border bg-paper px-2 py-1 text-xs text-ink placeholder:text-ink-faint focus:border-clay focus:outline-none"
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
        className="rounded-md bg-clay px-3 py-1 text-xs font-medium text-clay-ink transition-all hover:bg-clay-hover active:scale-[0.97] disabled:opacity-50"
      >
        {revising ? "Revising..." : "Go"}
      </button>
      <button onClick={() => setOpen(false)} className="text-xs text-ink-faint" disabled={revising}>
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
  delay,
}: {
  option: PlanOption;
  facts: Fact[];
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  onReviseStop: (stopIndex: number, instruction: string) => void;
  revisingStopIndex: number | null;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: EASE }}
      className="rounded-lg border border-border bg-paper-raised p-5 shadow-warm"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-display text-xl text-ink">{option.title}</h3>
        <button
          onClick={onSave}
          disabled={saving || saved}
          className="shrink-0 rounded-md bg-clay px-3 py-1.5 text-sm font-medium text-clay-ink transition-all hover:bg-clay-hover active:scale-[0.97] disabled:opacity-50"
        >
          {saved ? "Saved" : saving ? "Saving..." : "Save this plan"}
        </button>
      </div>
      <ul className="flex flex-col gap-4">
        {option.stops.map((stop, i) => (
          <li key={i} className="border-l-2 border-clay/40 pl-3.5">
            <div className="flex flex-wrap items-baseline gap-x-2">
              {stop.url ? (
                <a
                  href={stop.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-ink underline decoration-clay/50 underline-offset-2 transition-colors hover:text-clay"
                >
                  {stop.name}
                </a>
              ) : (
                <span className="font-medium text-ink">{stop.name}</span>
              )}
              {stop.time && <span className="text-sm text-ink-muted">{stop.time}</span>}
              {stop.cost_estimate && (
                <span className="text-sm text-ink-muted">{stop.cost_estimate}</span>
              )}
            </div>
            {stop.why && <p className="mt-0.5 text-sm text-ink-muted">{stop.why}</p>}
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
    </motion.div>
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
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-14">
      <Link
        href={`/people/${personId}`}
        className="text-sm text-ink-muted transition-colors hover:text-clay"
      >
        &larr; Back to {detail?.person.name ?? "profile"}
      </Link>

      <h1 className="mb-7 mt-3 font-display text-3xl italic tracking-tight text-ink">
        Plan an outing
      </h1>

      <form
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
      </form>

      {error && (
        <div className="rise-in mb-5 rounded-lg border border-rose/30 bg-rose-soft px-4 py-2.5 text-sm text-rose-ink">
          {error}
        </div>
      )}

      {options && options.length === 0 && (
        <p className="text-sm text-ink-muted">No options came back - try a different area or date.</p>
      )}

      {options && options.length > 0 && (
        <div className="flex flex-col gap-5">
          {options.map((option, i) => (
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
              delay={i * 0.08}
            />
          ))}
        </div>
      )}
    </div>
  );
}
