import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

// Fill this in before submitting to Google Play: the store requires a working contact.
const CONTACT_EMAIL = "your-email@example.com";
const UPDATED = "November 2, 2026";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy policy · Chart Pattern Trainer" }] }),
  component: Privacy,
});

function Privacy() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 md:py-12">
      <Link
        to="/"
        className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-fg"
      >
        <ArrowLeft size={16} aria-hidden />
        Back to the trainer
      </Link>
      <h1 className="mt-4 text-3xl font-bold [font-stretch:88%]">Privacy policy</h1>
      <p className="mt-1 text-sm text-muted">Last updated {UPDATED}</p>

      <div className="mt-8 flex flex-col gap-6 text-[15px] leading-relaxed">
        <Section title="The short version">
          Chart Pattern Trainer has no accounts, no ads and no tracking. We do not collect, sell or
          share your personal information.
        </Section>
        <Section title="What stays on your device">
          Your score, streak, recent calls and chosen deck are saved in your browser's local storage
          on your own device. They never leave it. Clearing the app's data or uninstalling the app
          deletes them.
        </Section>
        <Section title="What other services see">
          Like any website, the app is delivered by a hosting provider (Vercel), which keeps standard
          server logs such as IP address and browser type for security and reliability. Fonts load
          from Google Fonts, which receives your IP address when it serves them. We do not receive or
          use any of this data.
        </Section>
        <Section title="Market data">
          Real charts use historical daily prices from Yahoo Finance, prepared in advance and shipped
          with the app. Nothing about you is sent to Yahoo.
        </Section>
        <Section title="Children">
          The app is not directed at children under 13 and does not knowingly collect information
          from anyone.
        </Section>
        <Section title="Not financial advice">
          Chart Pattern Trainer is an educational drill. It does not offer trading, brokerage or
          investment advice.
        </Section>
        <Section title="Contact">
          Questions about this policy: <span className="font-semibold select-all">{CONTACT_EMAIL}</span>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold [font-stretch:88%]">{title}</h2>
      <p className="mt-1.5 text-fg/90">{children}</p>
    </section>
  );
}
