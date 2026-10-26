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
    <section className="mb-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Capture a note
      </h2>
      <form onSubmit={handleCapture} className="flex flex-col gap-2">
        <textarea
          className="min-h-20 resize-y rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          placeholder={'e.g. "Maya said she wants to try pottery, hates loud bars."'}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          type="submit"
          disabled={capturing || !text.trim()}
          className="self-start rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {capturing ? "Extracting facts..." : "Capture note"}
        </button>
      </form>

      {warning && (
        <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">{warning}</p>
      )}

      {draftNoteId !== null && (
        <div className="mt-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
            {chips.length > 0
              ? "Nano proposed these facts. Edit or remove any before saving."
              : "Nano didn't find any facts in that note."}
          </p>
          <ul className="mb-3 flex flex-col gap-2">
            {chips.map((chip, i) => (
              <li
                key={i}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 p-2 dark:border-zinc-800"
              >
                <select
                  className="rounded border border-zinc-300 bg-transparent px-2 py-1 text-sm dark:border-zinc-700"
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
                  className="min-w-40 flex-1 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  value={chip.value}
                  onChange={(e) => updateChip(i, { value: e.target.value })}
                />
                <select
                  className="rounded border border-zinc-300 bg-transparent px-2 py-1 text-sm dark:border-zinc-700"
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
                  className="ml-auto text-zinc-400 hover:text-red-600"
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
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
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
