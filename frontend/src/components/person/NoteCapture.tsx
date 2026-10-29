"use client";

import { FormEvent, useState } from "react";
import { api, ApiError, FactProposal } from "@/lib/api";
import { CATEGORY_LABEL, FACT_CATEGORIES, SENTIMENTS } from "@/lib/constants";

export default function NoteCapture({
  personId,
  onChange,
}: {
  personId: number;
  onChange: () => void;
}) {
  const [text, setText] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  const [draftNoteId, setDraftNoteId] = useState<number | null>(null);
  const [chips, setChips] = useState<FactProposal[]>([]);
  const [savingChips, setSavingChips] = useState(false);

  async function handleCapture(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setCapturing(true);
    setWarning(null);
    const submitted = text.trim();
    try {
      const result = await api.captureNote(personId, submitted);
      setText("");
      setDraftNoteId(result.note.id);
      setChips(result.proposed_facts);
      onChange();
    } catch (err) {
      // The note is saved server-side even if Nano extraction failed (e.g. no
      // Token Factory key configured yet) - refresh so it shows up, and let
      // the user know facts weren't auto-proposed this time.
      setText("");
      setWarning(
        err instanceof ApiError
          ? `Fact extraction didn't run: ${err.message}`
          : "Fact extraction didn't run, but your note was saved."
      );
      onChange();
    } finally {
      setCapturing(false);
    }
  }

  function updateChip(i: number, patch: Partial<FactProposal>) {
    setChips((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  function removeChip(i: number) {
    setChips((cs) => cs.filter((_, idx) => idx !== i));
  }

  async function handleSaveChips() {
    if (draftNoteId === null || chips.length === 0) {
      setDraftNoteId(null);
      setChips([]);
      return;
    }
    setSavingChips(true);
    try {
      await api.confirmFacts(draftNoteId, chips);
      setDraftNoteId(null);
      setChips([]);
      onChange();
    } catch (err) {
      setWarning(err instanceof ApiError ? err.message : "Couldn't save those facts.");
    } finally {
      setSavingChips(false);
    }
  }

  return (
    <section className="mb-7">
      <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-ink-faint">
        Capture a note
      </h2>
      <form onSubmit={handleCapture} className="flex flex-col gap-2">
        <textarea
          className="min-h-20 resize-y rounded-lg border border-border bg-paper-raised px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
          placeholder={'e.g. "Maya said she wants to try pottery, hates loud bars."'}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          type="submit"
          disabled={capturing || !text.trim()}
          className="self-start rounded-md bg-clay px-4 py-2 text-sm font-medium text-clay-ink shadow-warm transition-all hover:bg-clay-hover active:scale-[0.97] disabled:opacity-50"
        >
          {capturing ? "Extracting facts..." : "Capture note"}
        </button>
      </form>

      {warning && <p className="mt-2 text-sm text-amber">{warning}</p>}

      {draftNoteId !== null && (
        <div className="rise-in mt-4 rounded-lg border border-border bg-paper-raised p-4 shadow-warm">
          <p className="mb-3 text-sm text-ink-muted">
            {chips.length > 0
              ? "Nano proposed these facts. Edit or remove any before saving."
              : "Nano didn't find any facts in that note."}
          </p>
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
          <div className="flex gap-2">
            <button
              onClick={handleSaveChips}
              disabled={savingChips}
              className="rounded-md bg-clay px-4 py-2 text-sm font-medium text-clay-ink transition-all hover:bg-clay-hover active:scale-[0.97] disabled:opacity-50"
            >
              {savingChips
                ? "Saving..."
                : chips.length > 0
                  ? `Save ${chips.length} fact${chips.length === 1 ? "" : "s"}`
                  : "Dismiss"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
