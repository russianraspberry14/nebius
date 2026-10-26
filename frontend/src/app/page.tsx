"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import useSWR from "swr";
import { api, ApiError } from "@/lib/api";

export default function Home() {
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
      await api.createPerson({
        name: name.trim(),
        relationship: relationship.trim(),
        home_city: homeCity.trim() || undefined,
      });
      setName("");
      setRelationship("");
      setHomeCity("");
      setShowForm(false);
      await mutate();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't add that person.");
    } finally {
      setSubmitting(false);
    }
  }

  const topError = error ?? (loadError instanceof ApiError ? loadError.message : loadError ? "Could not reach the API." : null);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Kindred
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            A private notebook for being thoughtful.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {showForm ? "Cancel" : "Add person"}
        </button>
      </header>

      {topError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {topError}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleAddPerson}
          className="mb-8 flex flex-col gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
        >
          <input
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            placeholder="Relationship (partner, friend, sibling...)"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            required
          />
          <input
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            placeholder="Home city (optional)"
            value={homeCity}
            onChange={(e) => setHomeCity(e.target.value)}
          />
          <button
            type="submit"
            disabled={submitting}
            className="self-start rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {submitting ? "Saving..." : "Save person"}
          </button>
        </form>
      )}

      {people === undefined && !topError && (
        <p className="text-sm text-zinc-500">Loading...</p>
      )}

      {people !== undefined && people.length === 0 && (
        <p className="text-sm text-zinc-500">
          No one here yet. Add a person to start logging notes about them.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {people?.map((p) => (
          <li key={p.id}>
            <Link
              href={`/people/${p.id}`}
              className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
            >
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-50">{p.name}</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {p.relationship}
                  {p.home_city ? ` · ${p.home_city}` : ""}
                </p>
              </div>
              <span className="text-zinc-400">&rarr;</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
