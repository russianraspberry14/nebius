// A cheap, free heuristic for "this message wants a plan, not a fact to
// remember" - good enough to route the one shared capture box without
// spending a model call just to classify intent.
const PLAN_INTENT_PATTERN =
  /\b(plan|set up|organi[sz]e|surprise|book|schedule|arrange|take\s+\w+\s+out)\b/i;

export function looksLikePlanRequest(text: string): boolean {
  return PLAN_INTENT_PATTERN.test(text);
}
