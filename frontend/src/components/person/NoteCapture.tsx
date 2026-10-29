"use client";

import { FormEvent, useState } from "react";
import { api, ApiError, FactProposal } from "@/lib/api";
import { CATEGORY_LABEL, FACT_CATEGORIES, SENTIMENTS } from "@/lib/constants";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";

function MicIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 15a3.5 3.5 0 0 0 3.5-3.5V6a3.5 3.5 0 0 0-7 0v5.5A3.5 3.5 0 0 0 12 15Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M6 11v.5a6 6 0 0 0 12 0V11M12 17.5V21"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

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

  async function submitNote(noteText: string) {
    const trimmed = noteText.trim();
    if (!trimmed) return;
    setCapturing(true);
    setWarning(null);
    try {
      const result = await api.captureNote(personId, trimmed);
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

  async function handleCapture(e: FormEvent) {
    e.preventDefault();
    await submitNote(text);
  }

  // Voice capture is deliberately zero-friction: the moment speech ends, the
  // note is captured automatically - no extra click between hearing
  // something and it being saved. Transcription happens entirely in the
  // browser (no Nemotron audio model available on this account yet); the
  // resulting text goes through the same Nano extraction as typed notes.
  const {
    listening,
    interimText,
    supported: voiceSupported,
    error: voiceError,
    start: startListening,
    stop: stopListening,
  } = useSpeechRecognition({
    onFinalResult: (transcript) => {
      submitNote(transcript);
    },
  });

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
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-faint">
          Capture a note
        </h2>
        {voiceSupported && (
          <span className="text-xs text-ink-faint">Say it the moment you hear it</span>
        )}
      </div>
      <form onSubmit={handleCapture} className="flex flex-col gap-2">
        <div className="relative">
          <textarea
            className="min-h-20 w-full resize-y rounded-lg border border-border bg-paper-raised px-3 py-2 pr-12 text-sm text-ink placeholder:text-ink-faint focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            placeholder={'e.g. "Maya said she wants to try pottery, hates loud bars."'}
            value={listening ? interimText : text}
            onChange={(e) => setText(e.target.value)}
            disabled={listening}
            readOnly={listening}
          />
          {voiceSupported && (
            <button
              type="button"
              onClick={listening ? stopListening : startListening}
              aria-label={listening ? "Stop listening" : "Capture by voice"}
              className={`absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full border transition-all active:scale-90 ${
                listening
                  ? "animate-pulse border-rose bg-rose text-rose-ink"
                  : "border-border-strong bg-paper text-ink-muted hover:border-clay hover:text-clay"
              }`}
            >
              <MicIcon className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={capturing || !text.trim() || listening}
          className="self-start rounded-md bg-clay px-4 py-2 text-sm font-medium text-clay-ink shadow-warm transition-all hover:bg-clay-hover active:scale-[0.97] disabled:opacity-50"
        >
          {capturing ? "Extracting facts..." : "Capture note"}
        </button>
      </form>

      {voiceError && <p className="mt-2 text-sm text-rose">{voiceError}</p>}
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
