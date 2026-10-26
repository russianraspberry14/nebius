"use client";

import { useState } from "react";
import { api, ApiError, FactCategory, Note, Sentiment } from "@/lib/api";
import { CATEGORY_LABEL, FACT_CATEGORIES, SENTIMENTS } from "@/lib/constants";

function ManualFactForm({ noteId, onSaved }: { noteId: number; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<FactCategory>("like");
  const [value, setValue] = useState("");
  const [sentiment, setSentiment] = useState<Sentiment>("neutral");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!value.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.confirmFacts(noteId, [{ category, value: value.trim(), sentiment, confidence: 1 }]);
      setValue("");
      setOpen(false);
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save that fact.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-1 text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        + Add fact manually
      </button>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <select
        className="rounded border border-zinc-300 bg-transparent px-2 py-1 text-xs dark:border-zinc-700"
        value={category}
        onChange={(e) => setCategory(e.target.value as FactCategory)}
      >
        {FACT_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {CATEGORY_LABEL[c]}
          </option>
        ))}
      </select>
      <input
        className="min-w-32 flex-1 rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
        placeholder="e.g. wants to try pottery"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <select
        className="rounded border border-zinc-300 bg-transparent px-2 py-1 text-xs dark:border-zinc-700"
        value={sentiment}
        onChange={(e) => setSentiment(e.target.value as Sentiment)}
      >
        {SENTIMENTS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <button
        onClick={handleAdd}
        disabled={saving}
        className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
      >
        Add
      </button>
      <button onClick={() => setOpen(false)} className="text-xs text-zinc-400">
        Cancel
      </button>
      {error && <p className="w-full text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

export default function NotesList({
  notes,
  onChange,
}: {
  notes: Note[];
  onChange: () => void;
}) {
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(id: number) {
    try {
      await api.deleteNote(id);
      onChange();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't delete that note.");
    }
  }

  return (
    <section className="mb-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Notes
      </h2>
      {error && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {notes.length === 0 ? (
        <p className="text-sm text-zinc-500">No notes yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {notes.map((n) => (
            <li key={n.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-zinc-800 dark:text-zinc-200">{n.text}</p>
                <button
                  onClick={() => handleDelete(n.id)}
                  className="shrink-0 text-xs text-zinc-400 hover:text-red-600"
                >
                  Delete
                </button>
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                {new Date(n.created_at.replace(" ", "T") + "Z").toLocaleDateString()}
              </p>
              <ManualFactForm noteId={n.id} onSaved={onChange} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
