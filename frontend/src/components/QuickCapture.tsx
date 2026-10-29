"use client";

import { FormEvent, useState } from "react";
import useSWR, { mutate } from "swr";
import { api, ApiError, QuickCaptureResult } from "@/lib/api";
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

export default function QuickCapture() {
  const { data: people } = useSWR("people", () => api.listPeople());

  const [text, setText] = useState("");
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [result, setResult] = useState<QuickCaptureResult | null>(null);
  const [factsDone, setFactsDone] = useState(false);
  const [keyDateDone, setKeyDateDone] = useState(false);

  async function submit(noteText: string, personId?: number) {
    const trimmed = noteText.trim();
    if (!trimmed) return;
    setCapturing(true);
    setError(null);
    try {
      const captured = await api.quickCapture(trimmed, personId);
      setText("");
      setPendingText(null);
      setResult(captured);
      setFactsDone(false);
      setKeyDateDone(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        // Couldn't tell who it's about - keep the text and ask.
        setPendingText(trimmed);
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
        Quick capture
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

      {voiceError && <p className="mt-2 text-sm text-rose">{voiceError}</p>}
      {error && <p className="mt-2 text-sm text-rose">{error}</p>}

      {pendingText && (
        <div className="rise-in mt-3 rounded-lg border border-amber/30 bg-amber-soft p-3">
          <p className="mb-2 text-sm text-amber-ink">Who&rsquo;s this about?</p>
          <div className="flex flex-wrap gap-2">
            {people?.map((p) => (
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
        </div>
      )}

      {result && (
        <div className="rise-in mt-3 rounded-lg border border-border bg-paper-raised p-3">
          <p className="text-sm text-ink-muted">
            Added to <span className="font-medium text-ink">{result.person_name}</span>&rsquo;s notes.
          </p>
        </div>
      )}

      {result && !factsDone && (
        <ProposedFacts
          noteId={result.note.id}
          initialFacts={result.proposed_facts}
          onDone={() => setFactsDone(true)}
        />
      )}

      {result?.proposed_key_date && !keyDateDone && (
        <ProposedKeyDate
          personId={result.person_id}
          proposal={result.proposed_key_date}
          onSaved={() => {
            setKeyDateDone(true);
            mutate("upcoming-dates");
          }}
          onDismiss={() => setKeyDateDone(true)}
        />
      )}
    </section>
  );
}
