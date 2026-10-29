"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";
import { api, ApiError } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("What should we call you?");
      return;
    }
    if (password.length < 8) {
      setError("Password needs to be at least 8 characters.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.signup(name.trim(), email, password);
      // Registration doesn't itself create a NextAuth session - sign in
      // right after so the new account lands straight in the app.
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setError("Account created, but sign-in failed - try signing in manually.");
        setSubmitting(false);
        return;
      }
      router.push("/app");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Couldn't create that account. Try again."
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-14">
      <Link href="/" className="mb-8 text-xs font-medium uppercase tracking-[0.2em] text-clay">
        &larr; Kindred
      </Link>
      <h1 className="mb-1 font-display text-3xl italic text-ink">Create your notebook</h1>
      <p className="mb-8 text-sm text-ink-muted">
        Private to you &mdash; no one else sees what you log here.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-ink-muted">
          Name
          <input
            type="text"
            autoComplete="name"
            className="rounded-md border border-border bg-paper-raised px-3 py-2 text-sm text-ink focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-muted">
          Email
          <input
            type="email"
            autoComplete="email"
            className="rounded-md border border-border bg-paper-raised px-3 py-2 text-sm text-ink focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-muted">
          Password
          <input
            type="password"
            autoComplete="new-password"
            minLength={8}
            className="rounded-md border border-border bg-paper-raised px-3 py-2 text-sm text-ink focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <span className="text-xs text-ink-faint">At least 8 characters.</span>
        </label>

        {error && <p className="text-sm text-rose">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-md bg-clay px-4 py-2 text-sm font-medium text-clay-ink shadow-warm transition-all hover:bg-clay-hover active:scale-[0.97] disabled:opacity-50"
        >
          {submitting ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-ink-muted">
        Already have one?{" "}
        <Link href="/login" className="font-medium text-clay hover:text-clay-hover">
          Sign in
        </Link>
      </p>
    </div>
  );
}
