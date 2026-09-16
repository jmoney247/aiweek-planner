'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
type Preview = { id: string; body: string; display_name: string };
export default function RecentComments({ eventId }: { eventId: string }) {
  const root = useRef<HTMLDivElement>(null);
  const [posts, setPosts] = useState<Preview[]>([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let visible = false;
    const load = async () => {
      if (!visible) return;
      try {
        const result = await fetch(`/api/community?preview=1&event=${encodeURIComponent(eventId)}`, { signal: controller.signal, cache: 'no-store' });
        if (!result.ok) throw new Error('Preview unavailable');
        const data = await result.json(); setPosts(data.posts); setFailed(false);
      } catch { if (!controller.signal.aborted) setFailed(true); }
    };
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { visible = true; observer.disconnect(); void load(); } }, { rootMargin: '200px' });
    if (root.current) observer.observe(root.current);
    window.addEventListener('hype-posted', load);
    return () => { controller.abort(); observer.disconnect(); window.removeEventListener('hype-posted', load); };
  }, [eventId]);
  return <div ref={root}>{failed ? <p className="mt-2 text-xs text-ink-soft">Recent comments couldn’t load. Open Hype to try again.</p> : posts.length > 0 && <div className="mt-2 space-y-2 rounded-xl bg-canvas-soft p-3"><p className="text-xs font-bold">Recent Hype</p>{posts.map(post => <Link key={post.id} href={`/comments?post=${encodeURIComponent(post.id)}`} className="block min-h-[44px] text-sm"><span className="font-semibold">{post.display_name}: </span><span className="line-clamp-2 break-words">{post.body || 'Shared a photo.'}</span></Link>)}</div>}</div>;
}
