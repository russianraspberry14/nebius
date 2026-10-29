"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { FormEvent, useState } from "react";
import useSWR from "swr";
import { motion } from "motion/react";
import { api, ApiError } from "@/lib/api";
import QuickCapture from "@/components/QuickCapture";
import UpcomingPlans from "@/components/UpcomingPlans";
import UpcomingDates from "@/components/UpcomingDates";

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
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-14">
      <motion.header
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="mb-10 flex items-start justify-between"
      >
        <div>
          <Link
            href="/"
            className="mb-1 block text-xs font-medium uppercase tracking-[0.2em] text-clay"
          >
            Kindred
          </Link>
          <h1 className="font-display text-3xl italic tracking-tight text-ink">
            {ownerName ? `${ownerName}’s circle` : "Your circle"}
          </h1>
          {session?.user?.email && (
            <p className="mt-1 text-sm text-ink-faint">{session.user.email}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowForm((v) => !v)}
            className="shrink-0 rounded-md bg-clay px-4 py-2 text-sm font-medium text-clay-ink shadow-warm transition-all hover:bg-clay-hover active:scale-[0.97]"
          >
            {showForm ? "Cancel" : "Add person"}
          </button>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-sm text-ink-faint transition-colors hover:text-clay"
          >
            Sign out
          </button>
        </div>
      </motion.header>

      {topError && (
        <div className="rise-in mb-6 rounded-lg border border-rose/30 bg-rose-soft px-4 py-2.5 text-sm text-rose-ink">
          {topError}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleAddPerson}
          className="rise-in mb-8 flex flex-col gap-3 rounded-lg border border-border bg-paper-raised p-5 shadow-warm"
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
        </form>
      )}

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.05, ease: EASE }}
      >
        <QuickCapture />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.08, ease: EASE }}
      >
        <UpcomingPlans />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.14, ease: EASE }}
      >
        <UpcomingDates />
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

      <motion.ul
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease: EASE }}
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        {people?.map((p) => (
          <li key={p.id}>
            <Link
              href={`/people/${p.id}`}
              className="group flex h-full items-center gap-3 rounded-lg border border-border bg-paper-raised p-4 shadow-warm transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-warm-lg"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-clay/30 bg-clay-soft font-display text-base text-clay-hover">
                {initials(p.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-lg text-ink">{p.name}</p>
                <p className="truncate text-sm text-ink-muted">
                  {p.relationship}
                  {p.home_city ? ` · ${p.home_city}` : ""}
                </p>
              </div>
              <span className="shrink-0 text-clay transition-transform group-hover:translate-x-1">
                &rarr;
              </span>
            </Link>
          </li>
        ))}
      </motion.ul>
    </div>
  );
}
