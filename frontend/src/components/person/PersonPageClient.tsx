"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { api, ApiError } from "@/lib/api";
import KeyDates from "@/components/person/KeyDates";
import NoteCapture from "@/components/person/NoteCapture";
import NotesList from "@/components/person/NotesList";
import FactsList from "@/components/person/FactsList";

export default function PersonPageClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const personId = Number(params.id);

  const {
    data: detail,
    error: loadError,
    mutate,
  } = useSWR(`person-${personId}`, () => api.getPersonDetail(personId));
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
      router.push("/");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't delete this person.");
      setDeleting(false);
    }
  }

  if (loadError && !detail) {
    return (
      <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
          &larr; Back
        </Link>
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">
          {loadError instanceof ApiError ? loadError.message : "Could not reach the API."}
        </p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <p className="text-sm text-zinc-500">Loading...</p>
      </div>
    );
  }

  const { person, key_dates, notes, facts } = detail;

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
        &larr; Back
      </Link>

      <header className="mb-6 mt-2 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {person.name}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {person.relationship}
            {person.home_city ? ` · ${person.home_city}` : ""}
          </p>
        </div>
        <button
          onClick={handleDeletePerson}
          disabled={deleting}
          className="text-sm text-zinc-400 hover:text-red-600 disabled:opacity-50"
        >
          Delete person
        </button>
      </header>

      {error && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <KeyDates personId={personId} keyDates={key_dates} onChange={load} />
      <NoteCapture personId={personId} onChange={load} />
      <FactsList facts={facts} onChange={load} />
      <NotesList notes={notes} onChange={load} />
    </div>
  );
}
