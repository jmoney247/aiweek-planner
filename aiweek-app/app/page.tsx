import PlannerDashboard from "@/components/PlannerDashboard";

const FEEDBACK_MAILTO =
  "mailto:joshua19solomon@gmail.com?subject=Boston%20AI%20Week%20Planner%20Feedback";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-canvas">
      <PlannerDashboard />

      <section aria-label="Contact" className="mx-auto max-w-4xl px-4 py-12">
        <div className="gradient-ring rounded-2xl p-6 text-center md:p-8">
          <h2 className="text-xl font-bold">Want to see more updates?</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Tell Joshua what would make this planner more useful for you.
          </p>
          <a
            href={FEEDBACK_MAILTO}
            className="mt-4 inline-flex min-h-[44px] items-center rounded-full hero-gradient-bg px-6 py-2.5 font-semibold text-white shadow hover:opacity-90"
          >
            Email Joshua
          </a>
        </div>
      </section>

      <footer className="border-t border-zinc-200/70 py-8 text-center">
        <p className="text-sm text-ink-soft">Built to make Boston AI Week easier.</p>
      </footer>
    </main>
  );
}
