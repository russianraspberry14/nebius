"use client";

import { FormEvent, useState } from "react";
import { motion } from "motion/react";
import { api, ApiError, KeyDate } from "@/lib/api";
import { formatDate } from "@/lib/dates";
import DateField from "@/components/DateField";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function KeyDates({
  personId,
  keyDates,
  onChange,
}: {
  personId: number;
  keyDates: KeyDate[];
  onChange: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("");
  const [date, setDate] = useState("");
  const [recurring, setRecurring] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!label.trim() || !date) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.createKeyDate(personId, { label: label.trim(), date, recurring });
      setLabel("");
      setDate("");
      setRecurring(true);
      setShowForm(false);
      onChange();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't add that date.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.deleteKeyDate(id);
      onChange();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't delete that date.");
    }
  }

  return (
    <section className="mb-7">
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-ink-faint">
          Key dates
        </h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-sm font-medium text-clay transition-colors hover:text-clay-hover"
        >
          {showForm ? "Cancel" : "+ Add date"}
        </button>
      </div>

      {error && <p className="mb-2 text-sm text-rose">{error}</p>}

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="rise-in mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-paper-raised p-3 shadow-warm"
        >
          <input
            className="w-36 rounded-md border border-border bg-paper px-2 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            placeholder="Label (Birthday...)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
          />
          <DateField
            value={date}
            onChange={setDate}
            required
            className="rounded-md border border-border bg-paper py-1.5 pl-2 pr-7 text-sm text-ink focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
          />
          <label className="flex items-center gap-1.5 text-sm text-ink-muted">
            <input
              type="checkbox"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
              className="accent-clay"
            />
            Recurring
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-clay px-3 py-1.5 text-sm font-medium text-clay-ink transition-all hover:bg-clay-hover active:scale-[0.97] disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save"}
          </button>
        </form>
      )}

      {keyDates.length === 0 ? (
        <p className="text-sm text-ink-muted">No key dates yet.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {keyDates.map((kd, i) => (
            <motion.li
              key={kd.id}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 22, delay: i * 0.05 }}
              className="flex items-center gap-2 rounded-full border border-border bg-paper-raised px-3 py-1 text-sm"
            >
              <span className="font-medium text-ink">{kd.label}</span>
              <span className="text-ink-muted">{formatDate(kd.date)}</span>
              {kd.recurring && <span className="text-xs text-ink-faint">(yearly)</span>}
              <button
                onClick={() => handleDelete(kd.id)}
                className="text-ink-faint transition-colors hover:text-rose"
                aria-label={`Delete ${kd.label}`}
              >
                &times;
              </button>
            </motion.li>
          ))}
        </ul>
      )}
    </section>
  );
}
