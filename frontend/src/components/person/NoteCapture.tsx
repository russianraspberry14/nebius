"use client";

import { FormEvent, useState } from "react";
import { api, ApiError, FactProposal, KeyDateProposal } from "@/lib/api";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";
import ProposedFacts from "@/components/ProposedFacts";
import ProposedKeyDate from "@/components/ProposedKeyDate";

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
  const [proposedFacts, setProposedFacts] = useState<FactProposal[]>([]);
  const [keyDateProposal, setKeyDateProposal] = useState<KeyDateProposal | null>(null);

  async function submitNote(noteText: string) {
    const trimmed = noteText.trim();
    if (!trimmed) return;
    setCapturing(true);
    setWarning(null);
    try {
      const result = await api.captureNote(personId, trimmed);
      setText("");
      setDraftNoteId(result.note.id);
      setProposedFacts(result.proposed_facts);
      setKeyDateProposal(result.proposed_key_date);
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
        <ProposedFacts
          noteId={draftNoteId}
          initialFacts={proposedFacts}
          onDone={() => {
            setDraftNoteId(null);
            setProposedFacts([]);
            onChange();
          }}
        />
      )}

      {keyDateProposal && (
        <ProposedKeyDate
          personId={personId}
          proposal={keyDateProposal}
          onSaved={() => {
            setKeyDateProposal(null);
            onChange();
          }}
          onDismiss={() => setKeyDateProposal(null)}
        />
      )}
    </section>
  );
}
