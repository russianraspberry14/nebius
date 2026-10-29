"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

// Browser support never changes after load, so subscribe is a no-op - this
// just gives a hydration-safe way to read a client-only capability (server
// snapshot is always false, matching SSR output) without a post-mount
// setState-in-effect.
function subscribeNever() {
  return () => {};
}
function getSupportedSnapshot() {
  return getSpeechRecognitionCtor() !== null;
}
function getSupportedServerSnapshot() {
  return false;
}

/**
 * Browser-native speech-to-text (Web Speech API) - no server round trip, no
 * Nemotron audio model involved. Transcription happens client-side; the
 * resulting text goes through the same Nano fact-extraction path as a typed
 * note. Chrome/Edge/Safari support this; Firefox doesn't - `supported`
 * reflects that so callers can hide the mic button gracefully.
 */
export function useSpeechRecognition({
  onFinalResult,
}: {
  onFinalResult: (transcript: string) => void;
}) {
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onFinalResultRef = useRef(onFinalResult);
  useEffect(() => {
    onFinalResultRef.current = onFinalResult;
  });

  const supported = useSyncExternalStore(
    subscribeNever,
    getSupportedSnapshot,
    getSupportedServerSnapshot
  );

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    setError(null);
    setInterimText("");

    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let finalTranscript = "";

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      setInterimText(finalTranscript + interim);
    };

    recognition.onerror = (event) => {
      if (event.error === "no-speech") return;
      setError(
        event.error === "not-allowed" || event.error === "service-not-allowed"
          ? "Microphone access was denied."
          : "Couldn't hear that - try again."
      );
    };

    recognition.onend = () => {
      setListening(false);
      setInterimText("");
      if (finalTranscript.trim()) {
        onFinalResultRef.current(finalTranscript.trim());
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  return { listening, interimText, supported, error, start, stop };
}
