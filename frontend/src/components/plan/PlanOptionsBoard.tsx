"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { api, ApiError, Fact, PlaceCandidate, PlanOption } from "@/lib/api";
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

/** Other real places from the same search category as a stop - picking one
 * swaps the stop client-side, no LLM call needed since these are already
 * real, grounded candidates from the original search. */
function AlternativesCarousel({
  alternatives,
  onPick,
}: {
  alternatives: PlaceCandidate[];
  onPick: (alt: PlaceCandidate) => void;
}) {
  if (alternatives.length === 0) return null;
  return (
    <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
      {alternatives.map((alt) => (
        <button
          key={`${alt.name}-${alt.url ?? ""}`}
          onClick={() => onPick(alt)}
          title={alt.address ?? undefined}
          className="shrink-0 rounded-lg border border-border bg-paper px-3 py-1.5 text-left text-xs transition-colors hover:border-clay hover:bg-clay-soft"
        >
          <span className="block max-w-40 truncate font-medium text-ink">{alt.name}</span>
          <span className="text-ink-faint">Use this instead</span>
        </button>
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
  onSwapStop,
  delay,
}: {
  option: PlanOption;
  facts: Fact[];
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  onReviseStop: (stopIndex: number, instruction: string) => void;
  revisingStopIndex: number | null;
  onSwapStop: (stopIndex: number, alt: PlaceCandidate) => void;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.96, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.65, delay, ease: EASE }}
      whileHover={{ y: -3 }}
      className="rounded-xl border border-border bg-paper-raised p-5 shadow-warm transition-shadow hover:shadow-warm-lg"
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
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: delay + 0.15 + i * 0.07, ease: EASE }}
            className="border-l-2 border-clay/40 pl-3.5"
          >
            <div className="flex flex-wrap items-baseline gap-x-2">
              {stop.url ? (
                <a
                  href={stop.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-ink underline decoration-clay/50 underline-offset-2 transition-colors hover:text-clay"
                >
                  {stop.name?.trim() || "Something flexible"}
                </a>
              ) : (
                <span className="font-medium text-ink">
                  {stop.name?.trim() || "Something flexible"}
                </span>
              )}
              {stop.time && <span className="text-sm text-ink-muted">{stop.time}</span>}
              {stop.cost_estimate && (
                <span className="text-sm text-ink-muted">{stop.cost_estimate}</span>
              )}
              {!stop.verified && (
                <span
                  className="rounded-full bg-amber-soft px-2 py-0.5 text-xs font-medium text-amber-ink"
                  title="Couldn't find a specific real place for this one - treat it as an idea, not a confirmed spot."
                >
                  no specific spot found
                </span>
              )}
            </div>
            {stop.why && <p className="mt-0.5 text-sm text-ink-muted">{stop.why}</p>}
            <CitedFacts factIds={stop.cited_fact_ids} facts={facts} />
            {!saved && (
              <>
                <AlternativesCarousel
                  alternatives={stop.alternatives}
                  onPick={(alt) => onSwapStop(i, alt)}
                />
                <ReviseStopForm
                  onSubmit={(instruction) => onReviseStop(i, instruction)}
                  revising={revisingStopIndex === i}
                />
              </>
            )}
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}

/** Renders a generated set of plan options and owns everything you can do
 * with them afterward - save one, or swap a single stop - against a fixed
 * occasion/date/area/budget. Used by both the per-person plan form and the
 * plan-chat flow, so "modify/swap through the UI" behaves identically
 * everywhere a plan can be generated. */
export default function PlanOptionsBoard({
  personIds,
  occasion,
  date,
  area,
  budget,
  initialOptions,
  facts,
}: {
  personIds: number[];
  occasion: string;
  date: string;
  area: string;
  budget?: string;
  initialOptions: PlanOption[];
  facts: Fact[];
}) {
  const [options, setOptions] = useState(initialOptions);
  const [savedTitles, setSavedTitles] = useState<Set<string>>(new Set());
  const [savingTitle, setSavingTitle] = useState<string | null>(null);
  const [revising, setRevising] = useState<{ optionTitle: string; stopIndex: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(option: PlanOption) {
    setSavingTitle(option.title);
    setError(null);
    try {
      await api.savePlan({
        person_ids: personIds,
        occasion,
        date,
        area,
        budget,
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
    const optionIndex = options.findIndex((o) => o.title === optionTitle);
    if (optionIndex === -1) return;

    setRevising({ optionTitle, stopIndex });
    setError(null);
    try {
      const newStop = await api.reviseStop({
        person_ids: personIds,
        occasion,
        date,
        area,
        stops: options[optionIndex].stops,
        stop_index: stopIndex,
        instruction,
        budget,
      });
      setOptions((prev) => {
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

  function handleSwapStop(optionTitle: string, stopIndex: number, alt: PlaceCandidate) {
    const optionIndex = options.findIndex((o) => o.title === optionTitle);
    if (optionIndex === -1) return;

    setOptions((prev) => {
      const updated = [...prev];
      const stops = [...updated[optionIndex].stops];
      const current = stops[stopIndex];
      // The swapped-out stop rejoins the carousel (so the swap is
      // reversible), and the picked alternative drops out of it.
      const previousAsAlternative: PlaceCandidate = {
        name: current.name,
        address: null,
        rating: null,
        price_level: null,
        url: current.url,
        source: null,
      };
      stops[stopIndex] = {
        ...current,
        name: alt.name,
        url: alt.url,
        verified: true,
        alternatives: [
          previousAsAlternative,
          ...current.alternatives.filter((a) => a.name !== alt.name || a.url !== alt.url),
        ],
      };
      updated[optionIndex] = { ...updated[optionIndex], stops };
      return updated;
    });
  }

  return (
    <div>
      {error && (
        <p className="rise-in mb-5 border-l-2 border-rose/50 pl-3 text-sm text-rose-ink">{error}</p>
      )}

      {options.length === 0 ? (
        <p className="text-sm text-ink-muted">No options came back - try a different area or date.</p>
      ) : (
        <div className="flex flex-col gap-5">
          {options.map((option, i) => (
            <OptionCard
              key={option.title}
              option={option}
              facts={facts}
              onSave={() => handleSave(option)}
              saving={savingTitle === option.title}
              saved={savedTitles.has(option.title)}
              onReviseStop={(stopIndex, instruction) =>
                handleReviseStop(option.title, stopIndex, instruction)
              }
              onSwapStop={(stopIndex, alt) => handleSwapStop(option.title, stopIndex, alt)}
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
