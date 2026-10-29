"use client";

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M3.5 9.5h17M8 3v3.5M16 3v3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** A native date input with the browser's own (theme-mismatched) calendar
 * glyph made invisible but still clickable, and one of our own line icons
 * drawn in its place - so every date field in the app uses the same mark
 * as the rest of the icon system instead of a stray system-grey one. */
export default function DateField({
  value,
  onChange,
  required,
  disabled,
  className = "",
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        className={`${className} [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0`}
      />
      <CalendarIcon
        className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint ${disabled ? "opacity-50" : ""}`}
      />
    </div>
  );
}
