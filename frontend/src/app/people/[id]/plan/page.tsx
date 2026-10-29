import { Suspense } from "react";
import PlanPageClient from "@/components/person/PlanPageClient";

export const instant = false;

export default function PlanPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
          <p className="text-sm text-ink-muted">Loading...</p>
        </div>
      }
    >
      <PlanPageClient />
    </Suspense>
  );
}
