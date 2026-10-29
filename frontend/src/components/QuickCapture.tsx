"use client";

import { FormEvent, useState } from "react";
import useSWR from "swr";
import { api, ApiError, Person, QuickCaptureAmbiguous, QuickCaptureResult } from "@/lib/api";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";
import CaptureReview from "@/components/CaptureReview";
import ThinkingIndicator from "@/components/ThinkingIndicator";

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

function isAmbiguous(detail: unknown): detail is QuickCaptureAmbiguous {
  return (
    typeof detail === "object" &&
    detail !== null &&
    "candidates" in detail &&
    Array.isArray((detail as QuickCaptureAmbiguous).candidates)
  );
}

export default function QuickCapture() {
  const { data: people, mutate: mutatePeople } = useSWR("people", () => api.listPeople());

  const [text, setText] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [result, setResult] = useState<QuickCaptureResult | null>(null);

  // Ambiguous-person state: who it might be about, and the text waiting to
  // be re-submitted once that's resolved.
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [ambiguousMessage, setAmbiguousMessage] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Person[]>([]);
  const [showEveryone, setShowEveryone] = useState(false);
  const [addingPerson, setAddingPerson] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRelationship, setNewRelationship] = useState("");
  const [addingError, setAddingError] = useState<string | null>(null);

  function resetAmbiguous() {
    setPendingText(null);
    setAmbiguousMessage(null);
    setCandidates([]);
    setShowEveryone(false);
    setAddingPerson(false);
    setNewName("");
    setNewRelationship("");
    setAddingError(null);
  }

  async function submit(noteText: string, personId?: number) {
    const trimmed = noteText.trim();
    if (!trimmed) return;
    setCapturing(true);
    setError(null);
    try {
      const captured = await api.quickCapture(trimmed, personId);
      setText("");
      resetAmbiguous();
      setResult(captured);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && isAmbiguous(err.detail)) {
        setPendingText(trimmed);
        setAmbiguousMessage(err.detail.message);
        setCandidates(err.detail.candidates);
        setShowEveryone(false);
        setText("");
      } else {
        setError(err instanceof ApiError ? err.message : "Couldn't capture that.");
      }
    } finally {
      setCapturing(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await submit(text);
  }

  async function handleAddPerson() {
    if (!newName.trim() || !newRelationship.trim() || !pendingText) return;
    setAddingError(null);
    try {
      const person = await api.createPerson({
        name: newName.trim(),
        relationship: newRelationship.trim(),
      });
      await mutatePeople();
      await submit(pendingText, person.id);
    } catch (e) {
      setAddingError(e instanceof ApiError ? e.message : "Couldn't add that person.");
    }
  }

  const {
    listening,
    interimText,
    supported: voiceSupported,
    error: voiceError,
    start: startListening,
    stop: stopListening,
  } = useSpeechRecognition({
    onFinalResult: (transcript) => {
      submit(transcript);
    },
  });

  const otherPeople = people?.filter((p) => !candidates.some((c) => c.id === p.id)) ?? [];

  return (
    <section className="mb-8">
      <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-ink-faint">
        Add information for someone / plan something good!
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div className="relative">
          <textarea
            className="min-h-16 w-full resize-y rounded-lg border border-border bg-paper-raised px-3 py-2 pr-12 text-sm text-ink placeholder:text-ink-faint focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            placeholder={'Anything about anyone - "Maya graduated on 8th November" - say it or type it'}
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
          {capturing ? "Thinking..." : "Capture"}
        </button>
      </form>

      {capturing && <ThinkingIndicator label="Reading that..." />}
      {voiceError && <p className="mt-2 text-sm text-rose">{voiceError}</p>}
      {error && <p className="mt-2 text-sm text-rose">{error}</p>}

      {pendingText && (
        <div className="rise-in mt-3 rounded-lg border border-amber/30 bg-amber-soft p-3">
          <p className="mb-2 text-sm text-amber-ink">{ambiguousMessage}</p>

          {candidates.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {candidates.map((p) => (
                <button
                  key={p.id}
                  onClick={() => submit(pendingText, p.id)}
                  disabled={capturing}
                  className="rounded-full border border-clay bg-paper px-3 py-1 text-sm text-ink transition-colors hover:bg-clay-soft disabled:opacity-50"
                >
                  {p.name}
                </button>
              ))}
              {!showEveryone && otherPeople.length > 0 && (
                <button
                  onClick={() => setShowEveryone(true)}
                  className="rounded-full px-3 py-1 text-sm text-ink-faint underline-offset-2 hover:underline"
                >
                  Not them?
                </button>
              )}
            </div>
          )}

          {(candidates.length === 0 || showEveryone) && otherPeople.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {otherPeople.map((p) => (
                <button
                  key={p.id}
                  onClick={() => submit(pendingText, p.id)}
                  disabled={capturing}
                  className="rounded-full border border-border-strong bg-paper px-3 py-1 text-sm text-ink transition-colors hover:border-clay hover:text-clay disabled:opacity-50"
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}

          {!addingPerson ? (
            <button
              onClick={() => setAddingPerson(true)}
              className="text-sm font-medium text-amber-ink underline-offset-2 hover:underline"
            >
              + Someone new
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <input
                className="min-w-28 flex-1 rounded border border-border bg-paper px-2 py-1 text-sm text-ink"
                placeholder="Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <input
                className="min-w-28 flex-1 rounded border border-border bg-paper px-2 py-1 text-sm text-ink"
                placeholder="Relationship"
                value={newRelationship}
                onChange={(e) => setNewRelationship(e.target.value)}
              />
              <button
                onClick={handleAddPerson}
                disabled={capturing || !newName.trim() || !newRelationship.trim()}
                className="rounded-md bg-clay px-3 py-1 text-sm font-medium text-clay-ink transition-all hover:bg-clay-hover active:scale-[0.97] disabled:opacity-50"
              >
                Add & save
              </button>
            </div>
          )}
          {addingError && <p className="mt-1.5 text-xs text-rose">{addingError}</p>}
        </div>
      )}

      {result && (
        <div className="rise-in mt-3 rounded-lg border border-border bg-paper-raised p-3">
          <p className="text-sm text-ink-muted">
            Added to <span className="font-medium text-ink">{result.person_name}</span>&rsquo;s notes.
          </p>
        </div>
      )}

      {result && (
        <CaptureReview
          key={result.note.id}
          personId={result.person_id}
          noteId={result.note.id}
          initialFacts={result.proposed_facts}
          initialKeyDate={result.proposed_key_date}
          onDone={() => setResult(null)}
        />
      )}
    </section>
  );
}
