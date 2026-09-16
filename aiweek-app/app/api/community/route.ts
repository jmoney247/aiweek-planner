import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { requireServiceClient } from '@/lib/db';
import { HttpError, handleRoute } from '@/lib/http';
import { getSessionUser } from '@/lib/server-session';
import { communityWriter } from '@/lib/community-write';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return handleRoute(async () => {
    const sb = requireServiceClient();
    const session = await getSessionUser(req);
    const sp = req.nextUrl.searchParams;
    if (sp.get('preview') === '1') {
      if (!sp.get('event')) throw new HttpError(400, 'Choose an event.');
      const preview = await sb.from('community_feed').select('id,body,display_name_snapshot').eq('event_id', sp.get('event')).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(2);
      if (preview.error) throw new HttpError(503, 'Recent comments are temporarily unavailable.');
      return NextResponse.json({ posts: preview.data.map(p => ({ id: p.id, body: p.body, display_name: p.display_name_snapshot })) }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    const offset = Number(sp.get('offset') || 0);
    if (!Number.isSafeInteger(offset) || offset < 0) throw new HttpError(400, 'Invalid page.');
    let query = sb.from('community_feed').select('*');
    const post = sp.get('post');
    if (post) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(post)) throw new HttpError(400, 'Invalid comment link.');
      query = query.eq('id', post);
    }
    if (sp.get('event')) query = query.eq('event_id', sp.get('event'));
    if (sp.get('filter') === 'photos') query = query.neq('photo_paths', '{}');
    if (sp.get('filter') === 'comments') query = query.neq('body', '');
    if (sp.get('sort') === 'liked') query = query.order('likes', { ascending: false });
    const { data, error } = await query.order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + 20);
    if (error) throw new HttpError(503, 'Community posts are temporarily unavailable. Please try again later.');
    const rows = (data ?? []).slice(0, 20);
    const reactions = new Map<string, string>();
    if (session && rows.length) {
      const own = await sb.from('comment_reactions').select('comment_id,reaction').eq('user_id', session.userId).in('comment_id', rows.map(r => r.id));
      if (own.error) throw new HttpError(500, 'Could not load your reactions.');
      own.data?.forEach(r => reactions.set(r.comment_id, r.reaction));
    }
    const posts = await Promise.all(rows.map(async row => {
      const replies = await sb.from('event_comments').select('id', { count: 'exact', head: true }).eq('parent_id', row.id).eq('is_deleted', false).eq('moderation_state', 'visible');
      if (replies.error) throw new HttpError(503, 'Could not load discussion counts.');
      const paths: string[] = row.photo_paths ?? [];
      const signed = paths.length ? await sb.storage.from('community-photos').createSignedUrls(paths, 3600) : null;
      if (signed?.error || signed?.data?.some(p => p.error)) throw new HttpError(503, 'Could not load photos. Please try again.');
      return { id: row.id, parent_id: row.parent_id, event_id: row.event_id, event_title: row.event_title,
        display_name: row.display_name_snapshot, body: row.body, created_at: row.created_at,
        photos: signed?.data?.map(p => p.signedUrl) ?? [], likes: row.likes, dislikes: row.dislikes, reply_count: replies.count ?? 0,
        reaction: reactions.get(row.id) ?? null, is_mine: !!session && row.user_id === session.userId };
    }));
    return NextResponse.json({ posts, next_offset: (data?.length ?? 0) > 20 ? offset + 20 : null }, { headers: { 'Cache-Control': 'private, no-store' } });
  });
}

export async function POST(req: NextRequest) {
  return handleRoute(async () => {
    const session = await communityWriter(req, 'post', 5);
    if (Number(req.headers.get('content-length')) > 3_500_000) throw new HttpError(413, 'Please choose up to 3 photos, each under 1 MB.');
    const reader = req.body?.getReader();
    if (!reader) throw new HttpError(400, 'Please add a post.');
    const chunks: Uint8Array[] = []; let bytes = 0;
    for (;;) {
      const chunk = await reader.read(); if (chunk.done) break;
      bytes += chunk.value.length;
      if (bytes > 3_500_000) { await reader.cancel(); throw new HttpError(413, 'Your photos are too large. Use up to 3 photos under 1 MB each.'); }
      chunks.push(chunk.value);
    }
    let form: FormData;
    try { form = await new Response(new Uint8Array(Buffer.concat(chunks)), { headers: { 'content-type': req.headers.get('content-type') ?? '' } }).formData(); }
    catch { throw new HttpError(400, 'Please submit a valid post with photos.'); }
    const eventId = String(form.get('event_id') ?? '');
    const body = String(form.get('body') ?? '').trim();
    const parentId = form.get('parent_id') ? String(form.get('parent_id')) : null;
    const files = form.getAll('photos');
    const staged = form.getAll('photo_paths').map(String);
    if (body.length > 2000 || (!body && !files.length && !staged.length) || files.length + staged.length > 3) throw new HttpError(400, 'Add a comment, up to 3 photos, or both (2,000 characters maximum).');
    if (staged.some(path => !path.startsWith(`${session.userId}/staging/`) || !/^[0-9a-f-]{36}\/staging\/[0-9a-f-]{36}\.jpg$/.test(path)) || new Set(staged).size !== staged.length) throw new HttpError(400, 'Invalid photo attachment.');
    const sb = requireServiceClient();
    const event = await sb.from('events').select('id').eq('id', eventId).maybeSingle();
    if (event.error || !event.data) throw new HttpError(404, 'Event not found.');
    if (parentId) {
      const parent = await sb.from('event_comments').select('id').eq('id', parentId).eq('event_id', eventId).eq('is_deleted', false).eq('moderation_state','visible').maybeSingle();
      if (parent.error || !parent.data) throw new HttpError(400, 'The post you are replying to is no longer available.');
    }
    const images: Buffer[] = [];
    for (const path of staged) {
      const downloaded = await sb.storage.from('community-photos').download(path);
      if (downloaded.error || !downloaded.data || downloaded.data.size > 1_048_576) throw new HttpError(400, 'Photo upload is incomplete. Please try again.');
      files.push(new File([downloaded.data], 'photo.jpg', { type: 'image/jpeg' }));
    }
    for (const file of files) {
      if (!(file instanceof File) || file.size > 1_048_576 || !['image/jpeg','image/png','image/webp'].includes(file.type)) throw new HttpError(400, 'Use JPEG, PNG or WebP photos under 1 MB each.');
      try {
        const image = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 25_000_000, animated: false });
        const meta = await image.metadata();
        if (!['jpeg','png','webp'].includes(meta.format ?? '')) throw new Error('Invalid image');
        let output = await image.rotate().resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
        if (output.length > 1_000_000) output = await sharp(output).jpeg({ quality: 60 }).toBuffer();
        if (output.length > 1_048_576) throw new Error('Image too large');
        images.push(output);
      } catch { throw new HttpError(400, 'One photo could not be processed. Try a smaller JPEG, PNG or WebP.'); }
    }
    const id = randomUUID();
    const paths: string[] = [];
    try {
      for (let i = 0; i < images.length; i++) {
        const path = `${session.userId}/${id}/${i}.jpg`;
        const uploaded = await sb.storage.from('community-photos').upload(path, images[i], { contentType: 'image/jpeg', upsert: false });
        if (uploaded.error) throw new HttpError(503, 'Could not upload your photo. Nothing was posted.');
        paths.push(path);
      }
      const saved = await sb.from('event_comments').insert({ id, event_id: eventId, user_id: session.userId, display_name_snapshot: session.displayName, body, photo_paths: paths, parent_id: parentId });
      if (saved.error) throw new HttpError(503, 'Could not save your post. Please try again.');
      if (staged.length) await sb.storage.from('community-photos').remove(staged);
    } catch (error) {
      if (paths.length) await sb.storage.from('community-photos').remove(paths);
      throw error;
    }
    return NextResponse.json({ id }, { status: 201 });
  });
}
