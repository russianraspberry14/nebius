"use client";

import { useState } from "react";
import useSWR from "swr";
import { motion } from "motion/react";
import { api, ApiError, Person } from "@/lib/api";

const EASE = [0.16, 1, 0.3, 1] as const;

/** "Who's this about?" - shown whenever a name couldn't be resolved to
 * exactly one person. Leads with the actual name matches (if any), offers
 * to reveal everyone else, and always offers to add someone new on the
 * spot so a mention of someone not yet in the circle never gets dropped. */
export default function AmbiguousPersonPicker({
  message,
  candidates,
  onPick,
  onAddPerson,
  disabled,
}: {
  message: string;
  candidates: Person[];
  onPick: (personId: number) => void;
  onAddPerson: (name: string, relationship: string) => Promise<void>;
  disabled?: boolean;
}) {
  const { data: people, mutate: mutatePeople } = useSWR("people", () => api.listPeople());
  const [showEveryone, setShowEveryone] = useState(false);
  const [addingPerson, setAddingPerson] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRelationship, setNewRelationship] = useState("");
  const [addingError, setAddingError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const otherPeople = people?.filter((p) => !candidates.some((c) => c.id === p.id)) ?? [];

  async function handleAdd() {
    if (!newName.trim() || !newRelationship.trim()) return;
    setAdding(true);
    setAddingError(null);
    try {
      await onAddPerson(newName.trim(), newRelationship.trim());
      await mutatePeople();
    } catch (e) {
      setAddingError(e instanceof ApiError ? e.message : "Couldn't add that person.");
      setAdding(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="mt-4 border-l-2 border-amber/50 pl-4"
    >
      <p className="mb-2 text-sm text-amber-ink">{message}</p>

      {candidates.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {candidates.map((p) => (
            <button
              key={p.id}
              onClick={() => onPick(p.id)}
              disabled={disabled}
              className="rounded-full border border-clay bg-paper px-3 py-1 text-sm text-ink transition-colors hover:bg-clay-soft disabled:opacity-50"
            >
              {p.name}
            </button>
          ))}
          {!showEveryone && otherPeople.length > 0 && (
            <button
              onClick={() => setShowEveryone(true)}
              className="rounded-full px-3 py-1 text-sm text-ink-faint underline-offset-2 hover:underline"
            >
              Not them?
            </button>
          )}
        </div>
      )}

      {(candidates.length === 0 || showEveryone) && otherPeople.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {otherPeople.map((p) => (
            <button
              key={p.id}
              onClick={() => onPick(p.id)}
              disabled={disabled}
              className="rounded-full border border-border-strong bg-paper px-3 py-1 text-sm text-ink transition-colors hover:border-clay hover:text-clay disabled:opacity-50"
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {!addingPerson ? (
        <button
          onClick={() => setAddingPerson(true)}
          className="text-sm font-medium text-amber-ink underline-offset-2 hover:underline"
        >
          + Someone new
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="min-w-28 flex-1 rounded border border-border bg-paper px-2 py-1 text-sm text-ink"
            placeholder="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            className="min-w-28 flex-1 rounded border border-border bg-paper px-2 py-1 text-sm text-ink"
            placeholder="Relationship"
            value={newRelationship}
            onChange={(e) => setNewRelationship(e.target.value)}
          />
          <button
            onClick={handleAdd}
            disabled={disabled || adding || !newName.trim() || !newRelationship.trim()}
            className="rounded-md bg-clay px-3 py-1 text-sm font-medium text-clay-ink transition-all hover:bg-clay-hover active:scale-[0.97] disabled:opacity-50"
          >
            {adding ? "Adding..." : "Add & save"}
          </button>
        </div>
      )}
      {addingError && <p className="mt-1.5 text-xs text-rose">{addingError}</p>}
    </motion.div>
  );
}
