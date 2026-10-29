"use client";

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

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A textarea with an optional voice-capture mic button and an optional
 * submit arrow - the input half of every "say it or type it" capture box
 * in the app. The speech-recognition hook itself stays with the caller
 * (each has its own onFinalResult), this just renders the shared markup
 * against that hook's state. */
export default function VoiceTextArea({
  value,
  onChange,
  placeholder,
  listening,
  interimText,
  voiceSupported,
  onStartListening,
  onStopListening,
  minHeight = "min-h-16",
  showSubmitArrow = false,
  submitDisabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  listening: boolean;
  interimText: string;
  voiceSupported: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  minHeight?: string;
  /** Renders a round "submit" arrow next to the mic button - a type="submit"
   * button, so it relies on being inside the caller's <form>. */
  showSubmitArrow?: boolean;
  submitDisabled?: boolean;
}) {
  return (
    <div className="relative">
      <textarea
        className={`${minHeight} w-full resize-y rounded-lg border border-border bg-paper-raised px-3 py-2 ${
          voiceSupported && showSubmitArrow ? "pr-20" : "pr-12"
        } text-sm text-ink placeholder:text-ink-faint focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay`}
        placeholder={placeholder}
        value={listening ? interimText : value}
        onChange={(e) => onChange(e.target.value)}
        disabled={listening}
        readOnly={listening}
      />
      <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
        {voiceSupported && (
          <button
            type="button"
            onClick={listening ? onStopListening : onStartListening}
            aria-label={listening ? "Stop listening" : "Capture by voice"}
            className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all active:scale-90 ${
              listening
                ? "animate-pulse border-rose bg-rose text-rose-ink"
                : "border-border-strong bg-paper text-ink-muted hover:border-clay hover:text-clay"
            }`}
          >
            <MicIcon className="h-4 w-4" />
          </button>
        )}
        {showSubmitArrow && (
          <button
            type="submit"
            disabled={submitDisabled}
            aria-label="Submit"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-clay text-clay-ink shadow-warm transition-all hover:bg-clay-hover active:scale-90 disabled:opacity-40"
          >
            <ArrowIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
