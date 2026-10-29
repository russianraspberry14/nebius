"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { api, ApiError, Person, PlanChatSlots, PlanOption, QuickCaptureAmbiguous } from "@/lib/api";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";
import VoiceTextArea from "@/components/VoiceTextArea";
import AmbiguousPersonPicker from "@/components/AmbiguousPersonPicker";
import ThinkingIndicator from "@/components/ThinkingIndicator";
import PlanOptionsBoard from "@/components/plan/PlanOptionsBoard";

const EMPTY_SLOTS: PlanChatSlots = {
  occasion: null,
  date: null,
  area: null,
  budget: null,
  duration: null,
};

function isAmbiguous(detail: unknown): detail is QuickCaptureAmbiguous {
  return (
    typeof detail === "object" &&
    detail !== null &&
    "candidates" in detail &&
    Array.isArray((detail as QuickCaptureAmbiguous).candidates)
  );
}

type ChatMessage = { role: "user" | "system"; text: string };

/** The conversational twin of the per-person plan form: "plan a dinner
 * date for me and Maya" resolves who it's for, asks for whatever's still
 * missing (just date and area - occasion/budget/duration are nice-to-haves
 * with sensible fallbacks), then hands off to the exact same
 * generate-and-review pipeline as the form once it has enough. */
export default function PlanChat({
  initialText,
  onCancel,
}: {
  initialText: string;
  onCancel: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [slots, setSlots] = useState<PlanChatSlots>(EMPTY_SLOTS);
  const [personId, setPersonId] = useState<number | null>(null);
  const [personName, setPersonName] = useState<string | null>(null);
  const [options, setOptions] = useState<PlanOption[] | null>(null);

  const [text, setText] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pendingText, setPendingText] = useState<string | null>(null);
  const [ambiguousMessage, setAmbiguousMessage] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Person[]>([]);

  const { data: detail } = useSWR(
    personId ? `person-${personId}` : null,
    () => api.getPersonDetail(personId as number)
  );

  const hasSentInitial = useRef(false);
  useEffect(() => {
    if (hasSentInitial.current) return;
    hasSentInitial.current = true;
    setMessages([{ role: "user", text: initialText }]);
    sendTurn(initialText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendTurn(turnText: string, resolvedPersonId?: number) {
    setThinking(true);
    setError(null);
    try {
      const result = await api.planChat(turnText, resolvedPersonId ?? personId ?? undefined, slots);
      setPendingText(null);
      setPersonId(result.person_id);
      setPersonName(result.person_name);
      setSlots(result.slots);
      if (result.ready) {
        setOptions(result.options);
      } else {
        setMessages((m) => [...m, { role: "system", text: result.reply }]);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && isAmbiguous(err.detail)) {
        setPendingText(turnText);
        setAmbiguousMessage(err.detail.message);
        setCandidates(err.detail.candidates);
      } else {
        setError(err instanceof ApiError ? err.message : "Something went wrong there.");
      }
    } finally {
      setThinking(false);
    }
  }

  async function handleSend(turnText: string) {
    const trimmed = turnText.trim();
    if (!trimmed) return;
    setMessages((m) => [...m, { role: "user", text: trimmed }]);
    setText("");
    await sendTurn(trimmed);
  }

  const {
    listening,
    interimText,
    supported: voiceSupported,
    error: voiceError,
    start: startListening,
    stop: stopListening,
  } = useSpeechRecognition({ onFinalResult: handleSend });

  return (
    <div className="rise-in mt-3 rounded-lg border border-border bg-paper-raised p-4 shadow-warm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-faint">
          Planning{personName ? ` for ${personName}` : ""}
        </p>
        <button onClick={onCancel} className="text-xs text-ink-faint hover:text-rose">
          Cancel
        </button>
      </div>

      <ul className="mb-3 flex flex-col gap-2">
        {messages.map((m, i) => (
          <li
            key={i}
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
              m.role === "user"
                ? "ml-auto bg-clay text-clay-ink"
                : "bg-paper border border-border text-ink"
            }`}
          >
            {m.text}
          </li>
        ))}
      </ul>

      {thinking && <ThinkingIndicator label="Thinking..." />}
      {voiceError && <p className="mb-2 text-sm text-rose">{voiceError}</p>}
      {error && <p className="mb-2 text-sm text-rose">{error}</p>}

      {pendingText && (
        <AmbiguousPersonPicker
          message={ambiguousMessage ?? ""}
          candidates={candidates}
          disabled={thinking}
          onPick={(id) => sendTurn(pendingText, id)}
          onAddPerson={async (name, relationship) => {
            const person = await api.createPerson({ name, relationship });
            await sendTurn(pendingText, person.id);
          }}
        />
      )}

      {!options && !pendingText && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(text);
          }}
          className="flex flex-col gap-2"
        >
          <VoiceTextArea
            value={text}
            onChange={setText}
            placeholder="Your answer..."
            listening={listening}
            interimText={interimText}
            voiceSupported={voiceSupported}
            onStartListening={startListening}
            onStopListening={stopListening}
            minHeight="min-h-12"
          />
          <button
            type="submit"
            disabled={thinking || !text.trim() || listening}
            className="self-start rounded-md bg-clay px-4 py-2 text-sm font-medium text-clay-ink transition-all hover:bg-clay-hover active:scale-[0.97] disabled:opacity-50"
          >
            Send
          </button>
        </form>
      )}

      {options && personId && (
        <>
          <PlanOptionsBoard
            personIds={[personId]}
            occasion={slots.occasion ?? "outing"}
            date={slots.date ?? ""}
            area={slots.area ?? ""}
            budget={slots.budget ?? undefined}
            initialOptions={options}
            facts={detail?.facts ?? []}
          />
          <button
            onClick={onCancel}
            className="mt-3 text-sm font-medium text-ink-faint underline-offset-2 hover:underline"
          >
            Plan something else
          </button>
        </>
      )}
    </div>
  );
}
