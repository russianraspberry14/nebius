type IconProps = { className?: string };

const base = "stroke-current";

export function MicIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 15a3.5 3.5 0 0 0 3.5-3.5V6a3.5 3.5 0 0 0-7 0v5.5A3.5 3.5 0 0 0 12 15Z"
        className={base}
        strokeWidth="1.6"
      />
      <path
        d="M6 11v.5a6 6 0 0 0 12 0V11M12 17.5V21"
        className={base}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function TagIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M11.5 3.5H5a1.5 1.5 0 0 0-1.5 1.5v6.5a1.5 1.5 0 0 0 .44 1.06l8 8a1.5 1.5 0 0 0 2.12 0l6.5-6.5a1.5 1.5 0 0 0 0-2.12l-8-8a1.5 1.5 0 0 0-1.06-.44Z"
        className={base}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="8.25" cy="8.25" r="1.25" className={base} strokeWidth="1.6" />
    </svg>
  );
}

export function MapPinIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M19 10.5c0 5.25-7 11-7 11s-7-5.75-7-11a7 7 0 0 1 14 0Z"
        className={base}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10.5" r="2.5" className={base} strokeWidth="1.6" />
    </svg>
  );
}

export function BellIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9Z"
        className={base}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M9.5 17a2.5 2.5 0 0 0 5 0" className={base} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function ChatIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 12a8 8 0 1 1 3.4 6.55L4 19.5l1.1-3.2A7.96 7.96 0 0 1 4 12Z"
        className={base}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LockIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="1.5" className={base} strokeWidth="1.6" />
      <path d="M8 11V7.5a4 4 0 0 1 8 0V11" className={base} strokeWidth="1.6" />
    </svg>
  );
}

export function PersonPlusIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="9" cy="8" r="3.5" className={base} strokeWidth="1.6" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" className={base} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M18 8v6M15 11h6" className={base} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function SparkleIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2"
        className={base}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M12 9l1.2 2.8L16 13l-2.8 1.2L12 17l-1.2-2.8L8 13l2.8-1.2Z"
        className={base}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}
