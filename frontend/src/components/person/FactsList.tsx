"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { api, ApiError, Fact } from "@/lib/api";
import { CATEGORY_COLOR, CATEGORY_LABEL, FACT_CATEGORIES } from "@/lib/constants";

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

  // Grouped by category (in a fixed, consistent order) instead of
  // whatever order they were confirmed in, so related facts - every
  // dislike, every wishlist item - sit together instead of interleaved.
  const groups = FACT_CATEGORIES.map((category) => ({
    category,
    items: facts.filter((f) => f.category === category),
  })).filter((g) => g.items.length > 0);

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
        <div className="flex flex-col gap-3">
          {groups.map(({ category, items }, groupIndex) => (
            <div key={category}>
              <p className="mb-1.5 text-xs font-medium text-ink-faint">
                {CATEGORY_LABEL[category]}
              </p>
              <ul className="flex flex-wrap gap-2">
                {items.map((f, i) => (
                  <motion.li
                    key={f.id}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 22,
                      delay: groupIndex * 0.08 + i * 0.04,
                    }}
                    className={`group flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${CATEGORY_COLOR[category]}`}
                  >
                    <span>{f.value}</span>
                    <button
                      onClick={() => handleDelete(f.id)}
                      className="opacity-50 hover:opacity-100"
                      aria-label={`Delete fact: ${f.value}`}
                    >
                      &times;
                    </button>
                  </motion.li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
