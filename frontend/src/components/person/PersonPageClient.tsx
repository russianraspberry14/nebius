"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { motion } from "motion/react";
import { api, ApiError } from "@/lib/api";
import KeyDates from "@/components/person/KeyDates";
import NoteCapture from "@/components/person/NoteCapture";
import NotesList from "@/components/person/NotesList";
import FactsList from "@/components/person/FactsList";
import PlansList from "@/components/person/PlansList";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function PersonPageClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const personId = Number(params.id);

  const {
    data: detail,
    error: loadError,
    mutate,
  } = useSWR(`person-${personId}`, () => api.getPersonDetail(personId));
  const { data: plans } = useSWR(`person-${personId}-plans`, () => api.listPersonPlans(personId));
  const load = () => mutate();
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDeletePerson() {
    if (!confirm("Delete this person and everything logged about them? This can't be undone.")) {
      return;
    }
    setDeleting(true);
    try {
      await api.deletePerson(personId);
      router.push("/app");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't delete this person.");
      setDeleting(false);
    }
  }

  if (loadError && !detail) {
    return (
      <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <Link href="/app" className="text-sm text-ink-muted hover:text-clay">
          &larr; Back
        </Link>
        <p className="mt-4 text-sm text-rose">
          {loadError instanceof ApiError ? loadError.message : "Could not reach the API."}
        </p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <p className="text-sm text-ink-muted">Loading...</p>
      </div>
    );
  }

  const { person, key_dates, notes, facts } = detail;

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-14">
      <Link href="/app" className="text-sm text-ink-muted transition-colors hover:text-clay">
        &larr; Back
      </Link>

      <motion.header
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE }}
        className="mb-8 mt-3 flex items-start justify-between"
      >
        <div>
          <h1 className="font-display text-3xl italic tracking-tight text-ink">{person.name}</h1>
          <p className="text-sm text-ink-muted">
            {person.relationship}
            {person.home_city ? ` · ${person.home_city}` : ""}
          </p>
        </div>
        <Link
          href={`/people/${personId}/plan`}
          className="rounded-md bg-clay px-3 py-1.5 text-sm font-medium text-clay-ink shadow-warm transition-all hover:bg-clay-hover active:scale-[0.97]"
        >
          Plan an outing
        </Link>
      </motion.header>

      {error && <p className="mb-4 border-l-2 border-rose/50 pl-3 text-sm text-rose-ink">{error}</p>}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08, ease: EASE }}
      >
        <KeyDates personId={personId} keyDates={key_dates} onChange={load} />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: EASE }}
      >
        <NoteCapture personId={personId} onChange={load} />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.22, ease: EASE }}
      >
        <FactsList facts={facts} onChange={load} />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.29, ease: EASE }}
      >
        <NotesList notes={notes} onChange={load} />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.36, ease: EASE }}
      >
        <PlansList plans={plans ?? []} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.43, ease: EASE }}
        className="mt-10 flex justify-center border-t border-border pt-6"
      >
        <button
          onClick={handleDeletePerson}
          disabled={deleting}
          className="text-sm font-medium text-rose transition-colors hover:text-rose-ink disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete person"}
        </button>
      </motion.div>
    </div>
  );
}
