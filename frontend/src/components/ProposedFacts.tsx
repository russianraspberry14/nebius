"use client";

import { useState } from "react";
import { api, ApiError, FactProposal } from "@/lib/api";
import { CATEGORY_LABEL, FACT_CATEGORIES, SENTIMENTS } from "@/lib/constants";

export default function ProposedFacts({
  noteId,
  initialFacts,
  onDone,
}: {
  noteId: number;
  initialFacts: FactProposal[];
  onDone: () => void;
}) {
  const [chips, setChips] = useState<FactProposal[]>(initialFacts);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateChip(i: number, patch: Partial<FactProposal>) {
    setChips((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  function removeChip(i: number) {
    setChips((cs) => cs.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    if (chips.length === 0) {
      onDone();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.confirmFacts(noteId, chips);
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save those facts.");
      setSaving(false);
    }
  }

  return (
    <div className="rise-in mt-3 rounded-lg border border-border bg-paper-raised p-4 shadow-warm">
      <p className="mb-3 text-sm text-ink-muted">
        {chips.length > 0
          ? "Nano proposed these facts. Edit or remove any before saving."
          : "Nano didn't find any facts in that note."}
      </p>
      {chips.length > 0 && (
        <ul className="mb-3 flex flex-col gap-2">
          {chips.map((chip, i) => (
            <li
              key={i}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-paper p-2"
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
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mb-2 text-xs text-rose">{error}</p>}
      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-md bg-clay px-4 py-2 text-sm font-medium text-clay-ink transition-all hover:bg-clay-hover active:scale-[0.97] disabled:opacity-50"
      >
        {saving ? "Saving..." : chips.length > 0 ? `Save ${chips.length} fact${chips.length === 1 ? "" : "s"}` : "Dismiss"}
      </button>
    </div>
  );
}
