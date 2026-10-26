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

export interface NoteCaptureResult {
  note: Note;
  proposed_facts: FactProposal[];
}

export interface PersonDetail {
  person: Person;
  key_dates: KeyDate[];
  notes: Note[];
  facts: Fact[];
}

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? JSON.stringify(body);
    } catch {
      // ignore - keep statusText
    }
    throw new ApiError(res.status, detail);
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
};

export { ApiError };
