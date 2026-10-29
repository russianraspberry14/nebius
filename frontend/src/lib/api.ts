import { getSession } from "next-auth/react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type FactCategory =
  | "like"
  | "dislike"
  | "wishlist"
  | "dietary"
  | "constraint"
  | "past_experience";

export type Sentiment = "positive" | "negative" | "neutral";

export interface Person {
  id: number;
  name: string;
  relationship: string;
  home_city: string | null;
  created_at: string;
}

export interface KeyDate {
  id: number;
  person_id: number;
  label: string;
  date: string;
  recurring: boolean;
}

export interface Note {
  id: number;
  person_id: number;
  text: string;
  created_at: string;
}

export interface Fact {
  id: number;
  person_id: number;
  note_id: number;
  category: FactCategory;
  value: string;
  sentiment: Sentiment | null;
  confidence: number | null;
  confirmed: boolean;
}

export interface FactProposal {
  category: FactCategory;
  value: string;
  sentiment: Sentiment | null;
  confidence: number;
}

export interface KeyDateProposal {
  label: string;
  date: string;
}

export interface NoteCaptureResult {
  note: Note;
  proposed_facts: FactProposal[];
  proposed_key_date: KeyDateProposal | null;
}

export interface QuickCaptureResult {
  person_id: number;
  person_name: string;
  note: Note;
  proposed_facts: FactProposal[];
  proposed_key_date: KeyDateProposal | null;
}

export interface PersonDetail {
  person: Person;
  key_dates: KeyDate[];
  notes: Note[];
  facts: Fact[];
}

export interface PlanStop {
  name: string;
  time: string | null;
  url: string | null;
  cost_estimate: string | null;
  cited_fact_ids: number[];
  why: string | null;
}

export interface PlanOption {
  title: string;
  stops: PlanStop[];
}

export interface Plan {
  id: number;
  person_ids: number[];
  occasion: string;
  date: string;
  budget: string | null;
  area: string | null;
  stops: PlanStop[];
  status: string;
  created_at: string;
}

export interface GeneratePlanRequest {
  person_ids: number[];
  occasion: string;
  date: string;
  area: string;
  budget?: string;
  duration?: string;
  keywords?: string;
}

export interface UpcomingDate {
  person_id: number;
  person_name: string;
  key_date_id: number;
  label: string;
  date: string;
  days_until: number;
  recurring: boolean;
  draft_plan_id: number | null;
}

export interface ReviseStopRequest {
  person_ids: number[];
  occasion: string;
  date: string;
  area: string;
  stops: PlanStop[];
  stop_index: number;
  instruction: string;
  budget?: string;
}

export interface UpcomingPlan {
  id: number;
  occasion: string;
  date: string;
  person_ids: number[];
  person_names: string[];
  stops: PlanStop[];
  status: string;
}

export interface QuickCaptureAmbiguous {
  message: string;
  candidates: Person[];
}

class ApiError extends Error {
  status: number;
  // The raw `detail` from the response body, before it was flattened into
  // `message` - a string for most errors, but a structured object for ones
  // like QuickCaptureAmbiguous that the caller needs to parse further.
  detail: unknown;
  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Reads the current NextAuth session for every call rather than threading a
  // token through every component - keeps call sites unchanged for the
  // dozens of existing api.* calls, at the cost of one extra /api/auth/session
  // round trip per request (acceptable at this app's scale).
  const session = await getSession();
  const headers: HeadersInit = { "Content-Type": "application/json", ...init?.headers };
  if (session?.accessToken) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${session.accessToken}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    let detail: unknown = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? body;
    } catch {
      // ignore - keep statusText
    }
    const message = typeof detail === "string" ? detail : JSON.stringify(detail);
    throw new ApiError(res.status, message, detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  listPeople: () => request<Person[]>("/people"),

  createPerson: (data: { name: string; relationship: string; home_city?: string }) =>
    request<Person>("/people", { method: "POST", body: JSON.stringify(data) }),

  getPersonDetail: (personId: number) => request<PersonDetail>(`/people/${personId}`),

  deletePerson: (personId: number) =>
    request<void>(`/people/${personId}`, { method: "DELETE" }),

  createKeyDate: (
    personId: number,
    data: { label: string; date: string; recurring: boolean }
  ) =>
    request<KeyDate>(`/people/${personId}/key-dates`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deleteKeyDate: (keyDateId: number) =>
    request<void>(`/key-dates/${keyDateId}`, { method: "DELETE" }),

  captureNote: (personId: number, text: string) =>
    request<NoteCaptureResult>(`/people/${personId}/notes`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),

  deleteNote: (noteId: number) => request<void>(`/notes/${noteId}`, { method: "DELETE" }),

  confirmFacts: (noteId: number, facts: FactProposal[]) =>
    request<Fact[]>(`/notes/${noteId}/facts`, {
      method: "POST",
      body: JSON.stringify({ facts }),
    }),

  deleteFact: (factId: number) => request<void>(`/facts/${factId}`, { method: "DELETE" }),

  generatePlan: (data: GeneratePlanRequest) =>
    request<{ options: PlanOption[] }>("/plans/generate", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  savePlan: (data: {
    person_ids: number[];
    occasion: string;
    date: string;
    area?: string;
    budget?: string;
    stops: PlanStop[];
  }) => request<Plan>("/plans", { method: "POST", body: JSON.stringify(data) }),

  listPersonPlans: (personId: number) => request<Plan[]>(`/people/${personId}/plans`),

  getUpcomingDates: () => request<UpcomingDate[]>("/dashboard/upcoming-dates"),

  getUpcomingPlans: () => request<UpcomingPlan[]>("/plans/upcoming"),

  quickCapture: (text: string, personId?: number) =>
    request<QuickCaptureResult>("/dashboard/capture", {
      method: "POST",
      body: JSON.stringify({ text, person_id: personId ?? null }),
    }),

  reviseStop: (data: ReviseStopRequest) =>
    request<PlanStop>("/plans/revise-stop", { method: "POST", body: JSON.stringify(data) }),

  // Registration isn't a NextAuth concept - it goes straight to the backend,
  // which returns a token the caller then uses with next-auth's signIn()
  // (credentials provider) to establish a session.
  signup: (name: string, email: string, password: string) =>
    request<{ access_token: string }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),
};

export { ApiError };
