import { Suspense } from 'react';
import CommentsPageContent from '@/components/CommentsPageContent';
export default function CommentsPage() {
  return <main className="mx-auto max-w-7xl px-4 py-8 md:py-10"><Suspense fallback={<p>Loading comments…</p>}><CommentsPageContent /></Suspense></main>;
}
