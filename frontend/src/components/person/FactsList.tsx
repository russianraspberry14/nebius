"use client";

import { useState } from "react";
import { api, ApiError, Fact } from "@/lib/api";
import { CATEGORY_COLOR, CATEGORY_LABEL } from "@/lib/constants";

export default function FactsList({
  facts,
  onChange,
}: {
  facts: Fact[];
  onChange: () => void;
}) {
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(id: number) {
    try {
      await api.deleteFact(id);
      onChange();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't delete that fact.");
    }
  }

  return (
    <section className="mb-7">
      <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-ink-faint">
        Confirmed facts
      </h2>
      {error && <p className="mb-2 text-sm text-rose">{error}</p>}
      {facts.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Nothing confirmed yet - accepted facts from notes will show up here.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {facts.map((f) => (
            <li
              key={f.id}
              className={`group flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${CATEGORY_COLOR[f.category]}`}
            >
              <span className="text-xs font-medium opacity-70">{CATEGORY_LABEL[f.category]}</span>
              <span>{f.value}</span>
              <button
                onClick={() => handleDelete(f.id)}
                className="ml-1 opacity-50 hover:opacity-100"
                aria-label={`Delete fact: ${f.value}`}
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
