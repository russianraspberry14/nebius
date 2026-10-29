"use client";

import { useState } from "react";
import { api, ApiError, KeyDateProposal } from "@/lib/api";
import { formatDate } from "@/lib/dates";

const RECURRING_HINTS = ["birthday", "anniversary"];

export default function ProposedKeyDate({
  personId,
  proposal,
  onSaved,
  onDismiss,
}: {
  personId: number;
  proposal: KeyDateProposal;
  onSaved: () => void;
  onDismiss: () => void;
}) {
  const [label, setLabel] = useState(proposal.label);
  const [date, setDate] = useState(proposal.date);
  const [recurring, setRecurring] = useState(
    RECURRING_HINTS.some((hint) => proposal.label.toLowerCase().includes(hint))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!label.trim() || !date) return;
    setSaving(true);
    setError(null);
    try {
      await api.createKeyDate(personId, { label: label.trim(), date, recurring });
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save that date.");
      setSaving(false);
    }
  }

  return (
    <div className="rise-in mt-3 rounded-lg border border-sage/30 bg-sage-soft p-3">
      <p className="mb-2 text-sm text-sage-ink">
        Sounds like an important date: <strong>{formatDate(date)}</strong>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="min-w-32 flex-1 rounded border border-border bg-paper px-2 py-1 text-sm text-ink"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label"
        />
        <input
          type="date"
          className="rounded border border-border bg-paper px-2 py-1 text-sm text-ink"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <label className="flex items-center gap-1.5 text-xs text-ink-muted">
          <input
            type="checkbox"
            checked={recurring}
            onChange={(e) => setRecurring(e.target.checked)}
            className="accent-clay"
          />
          Yearly
        </label>
        <button
          onClick={handleSave}
          disabled={saving || !label.trim() || !date}
          className="rounded-md bg-clay px-3 py-1 text-xs font-medium text-clay-ink transition-all hover:bg-clay-hover active:scale-[0.97] disabled:opacity-50"
        >
          {saving ? "Saving..." : "Add date"}
        </button>
        <button onClick={onDismiss} className="text-xs text-ink-faint hover:text-rose">
          Dismiss
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-rose">{error}</p>}
    </div>
  );
}
