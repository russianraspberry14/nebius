/** A generic, deliberately simple black-and-white scene (not tied to the
 * app's warm palette) - three figures holding hands on a beach at sunset,
 * viewed from behind. Flat silhouettes, no line detail, so it reads as a
 * quiet editorial photo rather than an icon. */
export default function HoldingHandsIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 320" className={className} role="img" aria-label="Three people holding hands on a beach, silhouetted against the horizon">
      <defs>
        <linearGradient id="hh-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f2f2f0" />
          <stop offset="100%" stopColor="#d8d8d4" />
        </linearGradient>
        <linearGradient id="hh-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c6c6c2" />
          <stop offset="100%" stopColor="#b0b0ac" />
        </linearGradient>
        <radialGradient id="hh-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x="0" y="0" width="600" height="190" fill="url(#hh-sky)" />
      <rect x="0" y="190" width="600" height="130" fill="url(#hh-sea)" />

      <circle cx="300" cy="150" r="90" fill="url(#hh-sun)" />
      <circle cx="300" cy="150" r="38" fill="#ffffff" fillOpacity="0.85" />

      <g opacity="0.35" stroke="#8a8a85" strokeWidth="1.5" strokeLinecap="round">
        <path d="M60 220 Q 120 215 180 220 T 300 220" fill="none" />
        <path d="M320 240 Q 400 235 460 240 T 580 240" fill="none" />
        <path d="M20 265 Q 100 260 180 265 T 340 265" fill="none" />
      </g>

      {/* tallest figure, left */}
      <g fill="#201c18">
        <circle cx="258" cy="168" r="11" />
        <path d="M242 182 Q 258 176 274 182 L 280 260 Q 258 268 236 260 Z" />
      </g>
      {/* child, middle */}
      <g fill="#201c18">
        <circle cx="300" cy="196" r="8" />
        <path d="M289 207 Q 300 203 311 207 L 315 254 Q 300 259 285 254 Z" />
      </g>
      {/* medium figure, right */}
      <g fill="#201c18">
        <circle cx="340" cy="172" r="10.5" />
        <path d="M325 186 Q 340 180 355 186 L 360 258 Q 340 266 320 258 Z" />
      </g>

      <rect x="0" y="190" width="600" height="2" fill="#4a4a46" opacity="0.4" />
    </svg>
  );
}
