"use client";

import { useState } from "react";
import { mutate } from "swr";
import { AnimatePresence, motion } from "motion/react";
import { api, ApiError, FactProposal, KeyDateProposal } from "@/lib/api";
import { CATEGORY_LABEL, FACT_CATEGORIES, SENTIMENTS } from "@/lib/constants";
import { formatDate } from "@/lib/dates";

const EASE = [0.16, 1, 0.3, 1] as const;
const RECURRING_HINTS = ["birthday", "anniversary"];

/** One confirm step for everything Nano proposed from a single note - facts
 * and/or a key date - so accepting what it found is a single action instead
 * of two separate cards with their own save buttons. Sits directly in the
 * page flow (a left accent marks it as "attached to what you just said")
 * rather than inside its own boxed panel. */
export default function CaptureReview({
  personId,
  noteId,
  initialFacts,
  initialKeyDate,
  onDone,
}: {
  personId: number;
  noteId: number;
  initialFacts: FactProposal[];
  initialKeyDate: KeyDateProposal | null;
  onDone: () => void;
}) {
  const [chips, setChips] = useState<FactProposal[]>(initialFacts);

  const [includeDate, setIncludeDate] = useState(initialKeyDate !== null);
  const [dateLabel, setDateLabel] = useState(initialKeyDate?.label ?? "");
  const [dateValue, setDateValue] = useState(initialKeyDate?.date ?? "");
  const [dateRecurring, setDateRecurring] = useState(
    initialKeyDate ? RECURRING_HINTS.some((h) => initialKeyDate.label.toLowerCase().includes(h)) : false
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateChip(i: number, patch: Partial<FactProposal>) {
    setChips((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  function removeChip(i: number) {
    setChips((cs) => cs.filter((_, idx) => idx !== i));
  }

  const willSaveDate = initialKeyDate !== null && includeDate && dateLabel.trim() && dateValue;
  const saveParts = [
    chips.length > 0 ? `${chips.length} fact${chips.length === 1 ? "" : "s"}` : null,
    willSaveDate ? "a date" : null,
  ].filter((p): p is string => p !== null);
  const saveLabel = saveParts.length > 0 ? `Save ${saveParts.join(" & ")}` : "Dismiss";

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const tasks: Promise<unknown>[] = [];
      if (chips.length > 0) tasks.push(api.confirmFacts(noteId, chips));
      if (willSaveDate) {
        tasks.push(
          api.createKeyDate(personId, {
            label: dateLabel.trim(),
            date: dateValue,
            recurring: dateRecurring,
          })
        );
      }
      await Promise.all(tasks);
      if (willSaveDate) mutate("upcoming-dates");
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save that.");
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="mt-4 border-l-2 border-clay/40 pl-4"
    >
      {chips.length > 0 ? (
        <>
          <p className="mb-2.5 text-sm text-ink-muted">
            Nano proposed these facts. Edit or remove any before saving.
          </p>
          <ul className="mb-3 flex flex-col">
            <AnimatePresence initial={false}>
              {chips.map((chip, i) => (
                <motion.li
                  key={i}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12, height: 0, marginTop: 0, marginBottom: 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="flex flex-wrap items-center gap-2 border-b border-border py-2 first:pt-0 last:border-b-0"
                >
                  <select
                    className="rounded border border-border bg-paper-raised px-2 py-1 text-sm text-ink"
                    value={chip.category}
                    onChange={(e) =>
                      updateChip(i, { category: e.target.value as FactProposal["category"] })
                    }
                  >
                    {FACT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_LABEL[c]}
                      </option>
                    ))}
                  </select>
                  <input
                    className="min-w-40 flex-1 rounded border border-border bg-paper-raised px-2 py-1 text-sm text-ink"
                    value={chip.value}
                    onChange={(e) => updateChip(i, { value: e.target.value })}
                  />
                  <select
                    className="rounded border border-border bg-paper-raised px-2 py-1 text-sm text-ink"
                    value={chip.sentiment ?? "neutral"}
                    onChange={(e) =>
                      updateChip(i, { sentiment: e.target.value as FactProposal["sentiment"] })
                    }
                  >
                    {SENTIMENTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeChip(i)}
                    className="ml-auto text-ink-faint transition-colors hover:text-rose"
                    aria-label="Remove this fact"
                  >
                    &times;
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </>
      ) : (
        <p className="mb-3 text-sm text-ink-muted">Nano didn&rsquo;t find any facts in that note.</p>
      )}

      {initialKeyDate && (
        <div className="mb-3">
          <label className="mb-2 flex items-center gap-2 text-sm text-sage-ink">
            <input
              type="checkbox"
              checked={includeDate}
              onChange={(e) => setIncludeDate(e.target.checked)}
              className="accent-sage"
            />
            Also save as a key date: <strong>{formatDate(dateValue)}</strong>
          </label>
          <div className="flex flex-wrap items-center gap-2 pl-6">
            <input
              className="min-w-32 flex-1 rounded border border-border bg-paper-raised px-2 py-1 text-sm text-ink disabled:opacity-50"
              value={dateLabel}
              onChange={(e) => setDateLabel(e.target.value)}
              placeholder="Label"
              disabled={!includeDate}
            />
            <input
              type="date"
              className="rounded border border-border bg-paper-raised px-2 py-1 text-sm text-ink disabled:opacity-50"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              disabled={!includeDate}
            />
            <label className="flex items-center gap-1.5 text-xs text-ink-muted">
              <input
                type="checkbox"
                checked={dateRecurring}
                onChange={(e) => setDateRecurring(e.target.checked)}
                disabled={!includeDate}
                className="accent-clay"
              />
              Yearly
            </label>
          </div>
        </div>
      )}

      {error && <p className="mb-2 text-xs text-rose">{error}</p>}
      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-md bg-clay px-4 py-2 text-sm font-medium text-clay-ink transition-all hover:bg-clay-hover active:scale-[0.97] disabled:opacity-50"
      >
        {saving ? "Saving..." : saveLabel}
      </button>
    </motion.div>
  );
}
