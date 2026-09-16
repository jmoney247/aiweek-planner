"use client";
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { communityRequest, type CommunityPost } from '@/lib/community-client';
import { fetchAllEvents, type EventWithStats } from '@/lib/api';
import { useSessionGate } from './SessionGateProvider';
import ProfilePanel from './ProfilePanel';

const control = 'min-h-[44px] rounded-xl border border-stone-300 bg-white px-4 py-2';
type FeedResponse = { posts: CommunityPost[]; next_offset: number | null };
export default function CommunityFeed({ eventId }: { eventId?: string }) {
  const { requireSession } = useSessionGate();
  const [events, setEvents] = useState<EventWithStats[]>([]);
  const [event, setEvent] = useState(eventId ?? '');
  const [filter, setFilter] = useState('all'); const [sort, setSort] = useState('newest');
  const [posts, setPosts] = useState<CommunityPost[]>([]); const [next, setNext] = useState<number | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [revision, setRevision] = useState(0); const [busy, setBusy] = useState<string | null>(null);
  const [body, setBody] = useState(''); const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]); const [notice, setNotice] = useState('');
  const [composeEvent, setComposeEvent] = useState(eventId ?? '');
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => { if (!eventId) fetchAllEvents().then(setEvents).catch(e => setError(e.message)); }, [eventId]);
  useEffect(() => { const urls = files.map(f => URL.createObjectURL(f)); setPreviews(urls); return () => urls.forEach(url => URL.revokeObjectURL(url)); }, [files]);
  const query = useCallback((offset: number) => '/api/community?' + new URLSearchParams({ event: eventId ?? event, filter, sort, offset: String(offset) }), [eventId, event, filter, sort]);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(''); setPosts([]); setNext(null);
    communityRequest<FeedResponse>(query(0), { signal: controller.signal }).then(data => { setPosts(data.posts); setNext(data.next_offset); })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, revision]);
  const react = async (post: CommunityPost, choice: 'like' | 'dislike') => {
    setBusy(post.id); setError('');
    try {
      if (!await requireSession()) return;
      await communityRequest(`/api/community/${post.id}/reaction`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reaction: post.reaction === choice ? null : choice }) });
      setRevision(r => r + 1);
    } catch(e) { setError((e as Error).message); } finally { setBusy(null); }
  };
  return <section id={eventId ? undefined : 'community'} className="space-y-5 scroll-mt-24" aria-label="What people are saying">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-2xl font-extrabold md:text-3xl">What people are saying</h2><p className="mt-2 text-ink-soft">Honest experiences, photos, and questions from the community.</p></div><Link className={`${control} text-pink`} href="/#map">Explore the map</Link></header>
    <ProfilePanel />
    <div className="flex flex-wrap gap-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Post type">{['all','photos','comments'].map(value => <button key={value} aria-pressed={filter === value} className={`${control} ${filter === value ? '!bg-pink font-bold' : ''}`} onClick={() => setFilter(value)}>{filter === value ? '✓ ' : ''}{value[0].toUpperCase() + value.slice(1)}</button>)}</div>
      <label className="flex items-center gap-2">Sort<select className={control} value={sort} onChange={e => setSort(e.target.value)}><option value="newest">Newest first</option><option value="liked">Most liked</option></select></label>
      {!eventId && <label className="flex min-w-0 flex-1 items-center gap-2">Event<select className={`${control} min-w-0 max-w-full flex-1`} value={event} onChange={e => setEvent(e.target.value)}><option value="">All events</option>{events.map(e => <option key={e.id} value={e.id}>{e.display_title || e.title}</option>)}</select></label>}
    </div>
    <details className="rounded-2xl border bg-white p-5" open={eventId ? true : undefined}>
      <summary className="min-h-[44px] cursor-pointer font-bold">Been here? Share your experience and add a photo.</summary>
      <form className="mt-3 space-y-3" onSubmit={async e => {
        e.preventDefault(); setBusy('post'); setNotice('');
        try {
          if (!await requireSession()) return;
          const form = new FormData(); form.set('event_id', composeEvent); form.set('body', body); files.forEach(file => form.append('photos', file));
          await communityRequest('/api/community', { method: 'POST', body: form });
          setBody(''); setFiles([]); if (fileInput.current) fileInput.current.value = '';
          setNotice('Thanks—your experience has been posted.'); setFilter('all'); setSort('newest'); setEvent(''); setRevision(r => r + 1);
        } catch(e) { setNotice((e as Error).message); } finally { setBusy(null); }
      }}>
        {!eventId && <label className="block">Which event?<select required className={`${control} mt-1 block w-full`} value={composeEvent} onChange={e => setComposeEvent(e.target.value)}><option value="">Choose an event</option>{events.map(e => <option key={e.id} value={e.id}>{e.display_title || e.title}</option>)}</select></label>}
        <label className="block font-semibold">Your experience<textarea className="mt-2 block w-full rounded-xl border p-3 font-normal" rows={4} maxLength={2000} value={body} onChange={e => setBody(e.target.value)} placeholder="What did you like? What could have been better? Would you recommend going?" /></label>
        <label className="block">Add photos<input ref={fileInput} className="mt-2 block max-w-full" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e => {
          const chosen = [...files, ...Array.from(e.target.files ?? [])];
          if (chosen.length > 3 || chosen.some(f => f.size > 1048576 || !['image/jpeg','image/png','image/webp'].includes(f.type))) { setNotice('Choose up to 3 JPEG, PNG or WebP photos, under 1 MB each.'); e.target.value = ''; return; }
          setFiles(chosen); setNotice(''); e.target.value = '';
        }} /></label>
        <p className="text-sm text-ink-soft">Text, photos, or both. Up to 3 photos, under 1 MB each. Only upload photos you have permission to share. Posts are public; don’t include personal or sensitive information.</p>
        <div className="flex flex-wrap gap-3">{previews.map((url,i) => <div key={url}><img src={url} alt={`Selected photo ${i+1}`} className="h-24 w-24 rounded-xl object-cover" /><button type="button" className="min-h-[44px] text-sm underline" onClick={() => setFiles(files.filter((_,j) => i !== j))}>Remove photo {i+1}</button></div>)}</div>
        <button disabled={!!busy || (!body.trim() && !files.length)} className={`${control} !bg-pink font-bold disabled:opacity-50`}>{busy === 'post' ? 'Posting…' : 'Share experience'}</button>
        {notice && <p role="status">{notice}</p>}
      </form>
    </details>
    {notice && <p role="status">{notice}</p>}
    {loading && <p role="status">Loading community posts…</p>}
    {error && <div role="alert" className="rounded-xl border bg-white p-4">{error} <button className="min-h-[44px] underline" onClick={() => setRevision(r => r+1)}>Try again</button></div>}
    {!loading && !error && !posts.length && <p className="rounded-2xl bg-white p-6">No posts match yet. Be the first to share an experience.</p>}
    <div className="grid items-start gap-5 md:grid-cols-2">{posts.map(post => <article key={post.id} className="min-w-0 space-y-3 rounded-2xl border bg-white p-5 shadow-sm">
      <div><p className="font-bold">{post.display_name}</p><time className="text-sm text-ink-soft" dateTime={post.created_at}>{new Date(post.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</time></div>
      {!eventId && <Link className="block font-semibold text-pink underline" href={`/events/${encodeURIComponent(post.event_id)}`}>{post.event_title}</Link>}
      {post.body && <p className="whitespace-pre-wrap break-words">{post.body}</p>}
      {post.parent_id && <p className="text-xs text-ink-soft">A reply in this event’s discussion.</p>}
      {post.photos.length > 0 && <div className="grid gap-2">{post.photos.map((url,i) => <a key={url} href={url} target="_blank" rel="noopener noreferrer"><img className="max-h-96 w-full rounded-xl object-contain" loading="lazy" src={url} alt={`Photo ${i+1} shared by ${post.display_name} about ${post.event_title}`} /></a>)}</div>}
      <div className="flex flex-wrap gap-2">{(['like','dislike'] as const).map(choice => <button disabled={!!busy} aria-pressed={post.reaction === choice} className={`${control} ${post.reaction === choice ? '!bg-pink font-bold' : ''}`} key={choice} onClick={() => void react(post, choice)}>{post.reaction === choice ? '✓ ' : ''}{choice === 'like' ? 'Like' : 'Dislike'} · {choice === 'like' ? post.likes : post.dislikes}</button>)}</div>
      <Link className="inline-flex min-h-[44px] items-center text-pink underline" href={`/?event=${encodeURIComponent(post.event_id)}#map`}>View on map</Link>
      <details><summary className="min-h-[44px] cursor-pointer py-2 text-sm underline">Reply</summary><form className="space-y-2" onSubmit={async e => { e.preventDefault(); const formElement = e.currentTarget; const reply = new FormData(formElement); reply.set('event_id', post.event_id); reply.set('parent_id', post.id); setBusy(post.id); try { if (!await requireSession()) return; await communityRequest('/api/community',{method:'POST',body:reply}); setRevision(r=>r+1); } catch(e) { setError((e as Error).message); } finally { setBusy(null); } }}><label className="block text-sm">Your reply<textarea required maxLength={2000} name="body" className="mt-1 block w-full rounded-xl border p-3" /></label><button disabled={!!busy} className={control}>Post reply</button></form></details>
      {post.is_mine && <details><summary className="min-h-[44px] cursor-pointer py-2 text-sm underline">Edit text</summary><form className="space-y-2" onSubmit={async e=>{e.preventDefault();const form=new FormData(e.currentTarget);setBusy(post.id);try{await communityRequest(`/api/comments/${post.id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({body:form.get('body')})});setRevision(r=>r+1);}catch(e){setError((e as Error).message);}finally{setBusy(null);}}}><label className="block text-sm">Post text<textarea required maxLength={2000} name="body" defaultValue={post.body} className="mt-1 block w-full rounded-xl border p-3" /></label><button disabled={!!busy} className={control}>Save text</button></form></details>}
      <div className="flex gap-4 text-sm"><button disabled={!!busy} className="min-h-[44px] underline" onClick={async () => { setBusy(post.id); try { if (!await requireSession()) return; await communityRequest('/api/reports', { method: 'POST', headers: { 'content-type':'application/json' }, body: JSON.stringify({ target_type: 'comment', target_id: post.id, reason: 'Reported from community feed' }) }); setNotice('Report sent for review.'); } catch(e) { setError((e as Error).message); } finally { setBusy(null); } }}>Report post</button>
      {post.is_mine && <button className="min-h-[44px] underline" disabled={!!busy} onClick={async () => { if (!window.confirm('Remove your post from the community?')) return; setBusy(post.id); try { await communityRequest(`/api/comments/${post.id}`, { method:'DELETE' }); setRevision(r => r+1); } catch(e) { setError((e as Error).message); } finally { setBusy(null); } }}>Delete my post</button>}</div>
    </article>)}</div>
    {next !== null && <button disabled={!!busy} className={control} onClick={async () => { setBusy('more'); try { const data = await communityRequest<FeedResponse>(query(next)); setPosts(current => [...new Map([...current,...data.posts].map(p => [p.id,p])).values()]); setNext(data.next_offset); } catch(e) { setError((e as Error).message); } finally { setBusy(null); } }}>Load more posts</button>}
  </section>;
}
