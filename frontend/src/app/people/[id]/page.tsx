import { Suspense } from "react";
import PersonPageClient from "@/components/person/PersonPageClient";

// This page is a live view over a per-user SQLite store, not static content -
// the Suspense boundary gives the prerenderer a static fallback shell, and
// instant=false skips instant-navigation validation for the client-rendered body.
export const instant = false;

export default function PersonPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
          <p className="text-sm text-zinc-500">Loading...</p>
        </div>
      }
    >
      <PersonPageClient />
    </Suspense>
  );
}
