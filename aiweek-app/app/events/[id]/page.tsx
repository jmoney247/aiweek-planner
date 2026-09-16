"use client";
import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import type { Event } from '@/lib/types';
import { communityRequest } from '@/lib/community-client';
import { formatEventDate } from '@/lib/format';
import { RegisterButton } from '@/components/EventCard';
import CommunityFeed from '@/components/CommunityFeed';
import Attendance from '@/components/Attendance';
export default function EventPage({params}:{params:Promise<{id:string}>}) {
  const {id}=use(params); const [event,setEvent]=useState<Event|null>(null); const [error,setError]=useState('');
  useEffect(()=>{let active=true;setEvent(null);setError('');communityRequest<{event:Event}>(`/api/events/${encodeURIComponent(id)}`).then(r=>{if(active)setEvent(r.event);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[id]);
  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-8"><Link className="inline-flex min-h-[44px] items-center text-pink underline" href="/#map">Back to the map</Link>{error ? <p role="alert">{error}</p> : !event ? <p>Loading event…</p> : <><header className="space-y-3"><h1 className="text-3xl font-extrabold">{event.display_title || event.title}</h1><p>{formatEventDate(event.start_at,event.end_at)}</p><p>{[event.venue,event.address,event.city].filter(Boolean).join(' · ')}</p><p>{event.location_accuracy === 'approximate' ? 'Approximate district location—exact venue is undisclosed.' : event.lat == null ? 'Location not mapped yet.' : 'Map locations are approximate address or venue points; confirm arrival details with the organizer.'}</p><Link className="inline-flex min-h-[44px] items-center text-pink underline" href={`/?event=${encodeURIComponent(id)}#map`}>View on map</Link><p className="whitespace-pre-wrap">{event.about || event.description || event.summary}</p><RegisterButton event={event}/><p className="text-sm text-ink-soft">Check the organizer’s page for pricing, availability, and registration requirements.</p></header><Attendance eventId={id} startAt={event.start_at}/><CommunityFeed key={id} eventId={id}/></>}</main>;
}
