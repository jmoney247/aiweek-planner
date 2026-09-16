import PlannerDashboard from "@/components/PlannerDashboard";
import { Suspense } from 'react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-canvas">
      <Suspense fallback={<p className="p-8">Loading the planner…</p>}><PlannerDashboard /></Suspense>

    </main>
  );
}
