"use client";

import { FormEvent, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { api, ApiError, QuickCaptureAmbiguous, QuickCaptureResult } from "@/lib/api";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";
import { looksLikePlanRequest } from "@/lib/planIntent";
import VoiceTextArea from "@/components/VoiceTextArea";
import AmbiguousPersonPicker from "@/components/AmbiguousPersonPicker";
import CaptureReview from "@/components/CaptureReview";
import ThinkingIndicator from "@/components/ThinkingIndicator";
import PlanChat from "@/components/PlanChat";

const EASE = [0.16, 1, 0.3, 1] as const;

function isAmbiguous(detail: unknown): detail is QuickCaptureAmbiguous {
  return (
    typeof detail === "object" &&
    detail !== null &&
    "candidates" in detail &&
    Array.isArray((detail as QuickCaptureAmbiguous).candidates)
  );
}

export default function QuickCapture() {
  const [text, setText] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [result, setResult] = useState<QuickCaptureResult | null>(null);
  const [planText, setPlanText] = useState<string | null>(null);

  // Ambiguous-person state: who it might be about, and the text waiting to
  // be re-submitted once that's resolved.
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [ambiguousMessage, setAmbiguousMessage] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<import("@/lib/api").Person[]>([]);

  async function submit(noteText: string, personId?: number) {
    const trimmed = noteText.trim();
    if (!trimmed) return;

    if (!personId && looksLikePlanRequest(trimmed)) {
      setText("");
      setPlanText(trimmed);
      return;
    }

    setCapturing(true);
    setError(null);
    try {
      const captured = await api.quickCapture(trimmed, personId);
      setText("");
      setPendingText(null);
      setResult(captured);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && isAmbiguous(err.detail)) {
        setPendingText(trimmed);
        setAmbiguousMessage(err.detail.message);
        setCandidates(err.detail.candidates);
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

  return (
    <section className="mb-8">
      <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-ink-faint">
        Add information for someone / plan something good!
      </h2>

      <AnimatePresence mode="wait" initial={false}>
      {planText ? (
        <motion.div
          key="plan-chat"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          <PlanChat initialText={planText} onCancel={() => setPlanText(null)} />
        </motion.div>
      ) : (
        <motion.div
          key="capture"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <VoiceTextArea
              value={text}
              onChange={setText}
              placeholder={
                'Anything about anyone, or "plan a dinner date for me and Maya" - say it or type it'
              }
              listening={listening}
              interimText={interimText}
              voiceSupported={voiceSupported}
              onStartListening={startListening}
              onStopListening={stopListening}
            />
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
            <AmbiguousPersonPicker
              message={ambiguousMessage ?? ""}
              candidates={candidates}
              disabled={capturing}
              onPick={(id) => submit(pendingText, id)}
              onAddPerson={async (name, relationship) => {
                const person = await api.createPerson({ name, relationship });
                await submit(pendingText, person.id);
              }}
            />
          )}

          {result && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 text-sm text-ink-muted"
            >
              Added to <span className="font-medium text-ink">{result.person_name}</span>
              &rsquo;s notes.
            </motion.p>
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
        </motion.div>
      )}
      </AnimatePresence>
    </section>
  );
}
