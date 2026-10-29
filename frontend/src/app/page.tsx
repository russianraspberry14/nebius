import Link from "next/link";
import LandingNav from "@/components/landing/LandingNav";
import Hero from "@/components/landing/Hero";
import Reveal from "@/components/landing/Reveal";
import HoldingHandsIllustration from "@/components/landing/HoldingHandsIllustration";
import {
  BellIcon,
  ChatIcon,
  LockIcon,
  MapPinIcon,
  MicIcon,
  PersonPlusIcon,
  SparkleIcon,
  TagIcon,
} from "@/components/landing/icons";

const STEPS = [
  {
    icon: PersonPlusIcon,
    title: "Add someone",
    body: "A name, a relationship, their birthday. That's the whole form.",
  },
  {
    icon: MicIcon,
    title: "Say what you know",
    body: "By voice, the moment you hear it — no typing, no app-switching, no waiting until you're \"somewhere you can write it down.\"",
  },
  {
    icon: SparkleIcon,
    title: "Nemotron extracts the fact",
    body: "Nano turns a sentence into a structured, searchable fact — tagged, sourced, and shown to you to confirm before it's saved.",
  },
  {
    icon: MapPinIcon,
    title: "Get a cited plan",
    body: "When the date arrives, Ultra drafts an outing where every stop cites the note behind it — you get credit for paying attention.",
  },
];

const FEATURES = [
  {
    icon: MicIcon,
    title: "Voice capture",
    body: "A mic button that transcribes and files the fact automatically — zero friction between hearing something and keeping it.",
  },
  {
    icon: TagIcon,
    title: "Cited facts, not vibes",
    body: "Every like, dislike, and wishlist item traces back to the note it came from. Nothing is ever invented.",
  },
  {
    icon: MapPinIcon,
    title: "Real outing plans",
    body: "Grounded in actual places, events, and weather for the date — not generic suggestions.",
  },
  {
    icon: BellIcon,
    title: "Upcoming dates, pre-drafted",
    body: "Birthdays and key dates surface automatically, with a draft plan already waiting when they're close.",
  },
  {
    icon: ChatIcon,
    title: "Revise by chat",
    body: '"Swap dinner for something cheaper" — just say it, and only that stop changes.',
  },
  {
    icon: LockIcon,
    title: "Private, and yours",
    body: "Your notes belong to your account alone. No one else's data, no one else seeing yours.",
  },
];

export default function Landing() {
  return (
    <div className="flex-1">
      <LandingNav />
      <Hero />

      {/* Mission */}
      <section id="mission" className="scroll-section relative overflow-hidden border-t border-border px-6 py-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.12] blur-3xl"
          style={{ background: "radial-gradient(circle, var(--color-clay) 0%, transparent 70%)" }}
        />
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-clay">
              Why Kindred
            </p>
            <h2 className="font-display text-3xl italic text-ink sm:text-4xl">
              Built for attention that moves faster than memory
            </h2>
          </Reveal>
          <Reveal delay={0.1} className="mt-6 flex flex-col gap-4 text-ink-muted">
            <p>
              Someone mentions, in passing, that they&rsquo;ve always wanted to try pottery
              &mdash; and by the time it would actually be useful, it&rsquo;s gone. That&rsquo;s not
              a character flaw. For a lot of people, especially those with ADHD or
              generally scattered attention, details just don&rsquo;t stick the way other
              people expect them to.
            </p>
            <p>
              Kindred is built around that assumption instead of around willpower. Capture
              has to be as close to zero-friction as possible, so the moment you hear
              something, you say it out loud and it&rsquo;s done. No notes app to open, no
              remembering to write it down later, no guilt about forgetting.
            </p>
            <p>
              When the date actually arrives, Kindred has already done the remembering
              &mdash; and shows its work. Every stop in a plan cites the note behind it, so
              the two of you get credit for paying attention, even if the remembering
              wasn&rsquo;t you.
            </p>
          </Reveal>
          <Reveal delay={0.2} className="mt-10">
            <HoldingHandsIllustration className="w-full rounded-xl shadow-warm-lg" />
          </Reveal>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-section border-t border-border px-6 py-24">
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-clay">
              How it works
            </p>
            <h2 className="font-display text-3xl italic text-ink sm:text-4xl">
              Four steps, mostly spoken
            </h2>
          </Reveal>

          <div className="mt-12 flex flex-col gap-10">
            {STEPS.map((step, i) => (
              <Reveal key={step.title} delay={i * 0.08}>
                <div className="flex gap-5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-clay/30 bg-clay-soft text-clay-hover">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-ink-faint">
                      Step {i + 1}
                    </p>
                    <h3 className="font-display text-xl text-ink">{step.title}</h3>
                    <p className="mt-1 text-sm text-ink-muted">{step.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-section border-t border-border px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <Reveal className="mx-auto max-w-2xl">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-clay">
              What&rsquo;s inside
            </p>
            <h2 className="font-display text-3xl italic text-ink sm:text-4xl">
              Everything built around that one habit
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 0.08}>
                <div className="h-full rounded-lg border border-border bg-paper-raised p-5 shadow-warm transition-all hover:-translate-y-0.5 hover:shadow-warm-lg">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full border border-clay/30 bg-clay-soft text-clay-hover">
                    <f.icon className="h-4 w-4" />
                  </div>
                  <h3 className="font-display text-lg text-ink">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-ink-muted">{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border px-6 py-24">
        <Reveal className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <h2 className="font-display text-3xl italic text-ink sm:text-4xl">
            Stop losing track of the things that matter
          </h2>
          <p className="mt-4 max-w-sm text-sm text-ink-muted">
            Free to start. Private by default. Takes about a minute to add your
            first person.
          </p>
          <Link
            href="/signup"
            className="mt-7 rounded-md bg-clay px-6 py-3 text-sm font-medium text-clay-ink shadow-warm-lg transition-all hover:bg-clay-hover active:scale-[0.97]"
          >
            Get started free
          </Link>
        </Reveal>
      </section>

      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 text-xs text-ink-faint sm:flex-row">
          <p>Kindred &mdash; built on Nemotron 3, via Nebius Token Factory.</p>
          <p>MIT licensed.</p>
        </div>
      </footer>
    </div>
  );
}
