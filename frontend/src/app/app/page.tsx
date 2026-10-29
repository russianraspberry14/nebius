"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { FormEvent, useState } from "react";
import useSWR from "swr";
import { AnimatePresence, motion } from "motion/react";
import { api, ApiError } from "@/lib/api";
import AppNav from "@/components/AppNav";
import QuickCapture from "@/components/QuickCapture";
import UpNext from "@/components/UpNext";

const EASE = [0.16, 1, 0.3, 1] as const;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default function Dashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  const { data: people, error: loadError, mutate } = useSWR("people", () => api.listPeople());
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [homeCity, setHomeCity] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleAddPerson(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !relationship.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const person = await api.createPerson({
        name: name.trim(),
        relationship: relationship.trim(),
        home_city: homeCity.trim() || undefined,
      });
      await mutate();
      // Straight into capture - the whole point is catching what you know
      // about them before it slips away, not a second trip back later.
      router.push(`/people/${person.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't add that person.");
      setSubmitting(false);
    }
  }

  const topError = error ?? (loadError instanceof ApiError ? loadError.message : loadError ? "Could not reach the API." : null);
  const ownerName = session?.user?.name;

  return (
    <>
      <AppNav />
      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-14">
      <motion.header
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="mb-10 flex items-start justify-between"
      >
        <h1 className="font-display text-3xl italic tracking-tight text-ink">
          {ownerName ? `${ownerName}’s circle` : "Your circle"}
        </h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="shrink-0 rounded-md bg-clay px-4 py-2 text-sm font-medium text-clay-ink shadow-warm transition-all hover:bg-clay-hover active:scale-[0.97]"
        >
          {showForm ? "Cancel" : "Add person"}
        </button>
      </motion.header>

      {topError && (
        <p className="rise-in mb-6 border-l-2 border-rose/50 pl-3 text-sm text-rose-ink">
          {topError}
        </p>
      )}

      <AnimatePresence>
      {showForm && (
        <motion.form
          initial={{ opacity: 0, y: -10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.97 }}
          transition={{ duration: 0.4, ease: EASE }}
          onSubmit={handleAddPerson}
          className="mb-8 flex flex-col gap-3 rounded-lg border border-border bg-paper-raised p-5 shadow-warm"
        >
          <input
            className="rounded-md border border-border bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="rounded-md border border-border bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            placeholder="Relationship (partner, friend, sibling...)"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            required
          />
          <input
            className="rounded-md border border-border bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            placeholder="Home city (optional)"
            value={homeCity}
            onChange={(e) => setHomeCity(e.target.value)}
          />
          <button
            type="submit"
            disabled={submitting}
            className="self-start rounded-md bg-clay px-4 py-2 text-sm font-medium text-clay-ink transition-all hover:bg-clay-hover active:scale-[0.97] disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save person"}
          </button>
        </motion.form>
      )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 26, delay: 0.05 }}
      >
        <QuickCapture />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 26, delay: 0.12 }}
      >
        <UpNext />
      </motion.div>

      {people === undefined && !topError && (
        <p className="text-sm text-ink-muted">Loading...</p>
      )}

      {people !== undefined && people.length === 0 && (
        <p className="text-sm text-ink-muted">
          No one here yet. Add a person, then just talk &mdash; tell it whatever
          you&rsquo;d otherwise forget by tomorrow.
        </p>
      )}

      {people !== undefined && people.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-ink-faint">
            People
          </h2>
          <div className="flex flex-wrap gap-x-5 gap-y-4">
            {people.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.25 + i * 0.06 }}
              >
                <Link
                  href={`/people/${p.id}`}
                  className="group flex w-20 flex-col items-center gap-2 text-center"
                >
                  <motion.span
                    whileHover={{ scale: 1.08, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    className="flex h-16 w-16 items-center justify-center rounded-full border border-clay/30 bg-clay-soft font-display text-xl text-clay-hover shadow-warm transition-shadow group-hover:shadow-warm-lg"
                  >
                    {initials(p.name)}
                  </motion.span>
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm text-ink">{p.name}</p>
                    <p className="truncate text-xs text-ink-faint">{p.relationship}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      )}
      </div>
    </>
  );
}
