"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { FormEvent, Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/app";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setError("Incorrect email or password.");
      setSubmitting(false);
      return;
    }
    router.push(callbackUrl);
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-14">
      <Link href="/" className="mb-8 text-xs font-medium uppercase tracking-[0.2em] text-clay">
        &larr; Kindred
      </Link>
      <h1 className="mb-1 font-display text-3xl italic text-ink">Welcome back</h1>
      <p className="mb-8 text-sm text-ink-muted">Sign in to see your people.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
            autoComplete="current-password"
            className="rounded-md border border-border bg-paper-raised px-3 py-2 text-sm text-ink focus:border-clay focus:outline-none focus:ring-1 focus:ring-clay"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error && <p className="text-sm text-rose">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-md bg-clay px-4 py-2 text-sm font-medium text-clay-ink shadow-warm transition-all hover:bg-clay-hover active:scale-[0.97] disabled:opacity-50"
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-sm text-ink-muted">
        New here?{" "}
        <Link href="/signup" className="font-medium text-clay hover:text-clay-hover">
          Create an account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
