"use client";

import { FormEvent, useState } from "react";
import { api, ApiError, KeyDate } from "@/lib/api";

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
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Key dates
        </h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          {showForm ? "Cancel" : "+ Add date"}
        </button>
      </div>

      {error && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
        >
          <input
            className="w-36 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            placeholder="Label (Birthday...)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
          />
          <input
            type="date"
            className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <label className="flex items-center gap-1 text-sm text-zinc-600 dark:text-zinc-400">
            <input
              type="checkbox"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
            />
            Recurring
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {submitting ? "Saving..." : "Save"}
          </button>
        </form>
      )}

      {keyDates.length === 0 ? (
        <p className="text-sm text-zinc-500">No key dates yet.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {keyDates.map((kd) => (
            <li
              key={kd.id}
              className="flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1 text-sm dark:border-zinc-800"
            >
              <span className="font-medium">{kd.label}</span>
              <span className="text-zinc-500">{kd.date}</span>
              {kd.recurring && <span className="text-xs text-zinc-400">(yearly)</span>}
              <button
                onClick={() => handleDelete(kd.id)}
                className="text-zinc-400 hover:text-red-600"
                aria-label={`Delete ${kd.label}`}
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
