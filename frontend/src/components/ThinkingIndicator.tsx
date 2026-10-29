export default function ThinkingIndicator({ label }: { label: string }) {
  return (
    <p className="mt-2 flex items-center gap-2 text-xs text-ink-faint">
      <span className="flex gap-0.5">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-clay [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-clay [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-clay" />
      </span>
      {label}
    </p>
  );
}
