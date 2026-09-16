import Link from "next/link";
import MapSection from "@/components/MapSection";

const FEEDBACK_MAILTO =
  "mailto:joshua19solomon@gmail.com?subject=Boston%20AI%20Week%20Planner%20Feedback";

/**
 * Homepage: compact header, the two-card feature section (see
 * docs/top-feature-section.md — implemented exactly), map, contact card,
 * footer. No popup, no prices.
 */
export default function HomePage() {
  return (
    <main className="min-h-screen bg-canvas">
      {/* Compact header */}
      <div className="mx-auto max-w-5xl px-4 pt-10 text-center md:pt-14">
        <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
          Boston <span className="gradient-text">AI Week</span>
        </h1>
        <p className="mt-3 text-lg text-ink-soft">
          Find it. Get there. Meet people.
        </p>
      </div>

      {/* Two-card feature section — exactly two cards, copy per spec */}
      <section aria-label="Ways to explore" className="mx-auto max-w-4xl px-4 pt-8">
        <div className="grid gap-4 md:grid-cols-2">
          <Link
            href="#map"
            className="group flex min-h-[44px] items-start gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <span
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-insta-gradient text-2xl text-white"
            >
              🗺️
            </span>
            <span>
              <span className="block text-lg font-bold group-hover:text-primary">
                Find events near you
              </span>
              <span className="mt-1 block text-sm text-ink-soft">
                See what's happening across Boston and how far away it is.
              </span>
            </span>
          </Link>
          <Link
            href="/gallery#community"
            className="group flex min-h-[44px] items-start gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <span
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-insta-gradient text-2xl text-white"
            >
              💬
            </span>
            <span>
              <span className="block text-lg font-bold group-hover:text-primary">
                See what people think
              </span>
              <span className="mt-1 block text-sm text-ink-soft">
                Like, dislike, and join the conversation about each event.
              </span>
            </span>
          </Link>
        </div>
      </section>

      {/* Map */}
      <section id="map" aria-label="Event map" className="mt-10 scroll-mt-20">
        <div className="mx-auto mb-4 flex max-w-6xl items-baseline justify-between px-4">
          <h2 className="text-2xl font-bold">Explore the map</h2>
          <Link href="/gallery" className="text-sm font-semibold text-primary hover:underline">
            Browse all events →
          </Link>
        </div>
        <MapSection />
      </section>

      {/* Contact card */}
      <section aria-label="Contact" className="mx-auto max-w-4xl px-4 py-12">
        <div className="gradient-ring rounded-2xl p-6 text-center md:p-8">
          <h2 className="text-xl font-bold">Want to see more updates?</h2>
          <p className="mt-2 text-sm text-ink-soft">
            This planner is a work in progress — tell Joshua what would make it
            more useful for you.
          </p>
          <a
            href={FEEDBACK_MAILTO}
            className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-primary-bright px-6 py-2.5 font-semibold text-white shadow hover:bg-primary-ink"
          >
            Email Joshua
          </a>
        </div>
      </section>

      <footer className="border-t border-stone-200/70 py-8 text-center">
        <p className="text-sm text-ink-soft">Built to make Boston AI Week easier.</p>
        <p className="mt-1 text-sm">
          <a
            href="mailto:joshua19solomon@gmail.com"
            className="font-medium text-primary hover:underline"
          >
            joshua19solomon@gmail.com
          </a>
        </p>
      </footer>
    </main>
  );
}
