begin;

alter table public.events add column if not exists lat double precision;
alter table public.events add column if not exists lng double precision;
alter table public.events add column if not exists location_accuracy text;
alter table public.events add constraint events_coordinate_range check (
  (lat is null and lng is null) or (lat is not null and lng is not null and lat between -90 and 90 and lng between -180 and 180)
);

-- Preserve existing comments, including threaded replies and moderation.
alter table public.event_comments add column photo_paths text[] not null default '{}';
alter table public.event_comments drop constraint event_comments_body_check;
alter table public.event_comments add constraint event_comments_content_check check (
  char_length(body) <= 2000 and cardinality(photo_paths) <= 3
  and (char_length(btrim(body)) > 0 or cardinality(photo_paths) > 0)
);

create table public.comment_reactions (
  comment_id uuid not null references public.event_comments(id) on delete cascade,
  user_id uuid not null references public.anon_users(id) on delete cascade,
  reaction text not null check (reaction in ('like','dislike')),
  primary key (comment_id,user_id)
);
create table public.event_attendance (
  event_id text not null references public.events(id) on delete cascade,
  user_id uuid not null references public.anon_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(event_id,user_id)
);
create table public.website_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.anon_users(id) on delete set null,
  kind text not null check(kind in ('review','improvement')),
  body text not null check(char_length(body) between 3 and 2000),
  created_at timestamptz not null default now()
);
alter table public.comment_reactions enable row level security;
alter table public.event_attendance enable row level security;
alter table public.website_feedback enable row level security;
-- No anon/authenticated policies: the API checks the opaque browser session.
revoke all on public.comment_reactions,public.event_attendance,public.website_feedback from anon,authenticated;
grant all on public.comment_reactions,public.event_attendance,public.website_feedback to service_role;

create view public.community_feed as
select c.*, e.title as event_title, e.start_at as event_start_at,
  coalesce(r.likes,0)::integer as likes, coalesce(r.dislikes,0)::integer as dislikes
from public.event_comments c
join public.events e on e.id=c.event_id
left join (
 select comment_id,count(*) filter(where reaction='like') as likes,
 count(*) filter(where reaction='dislike') as dislikes
 from public.comment_reactions group by comment_id
) r on r.comment_id=c.id
where not c.is_deleted and c.moderation_state='visible';
revoke all on public.community_feed from public,anon,authenticated;
grant select on public.community_feed to service_role;

create table public.community_write_budgets (
  user_id uuid not null references public.anon_users(id) on delete cascade,
  action text not null,
  window_start timestamptz not null default now(),
  attempts integer not null default 1,
  primary key(user_id,action)
);
alter table public.community_write_budgets enable row level security;
revoke all on public.community_write_budgets from anon,authenticated;
grant all on public.community_write_budgets to service_role;
create function public.consume_community_budget(p_user uuid,p_action text,p_limit integer)
returns boolean language plpgsql security definer set search_path=public as $$
declare used integer;
begin
  insert into public.community_write_budgets(user_id,action) values(p_user,p_action)
  on conflict(user_id,action) do update set
    attempts=case when community_write_budgets.window_start < now()-interval '1 minute' then 1 else community_write_budgets.attempts+1 end,
    window_start=case when community_write_budgets.window_start < now()-interval '1 minute' then now() else community_write_budgets.window_start end
  returning attempts into used;
  return used <= p_limit;
end;
$$;
revoke all on function public.consume_community_budget(uuid,text,integer) from public,anon,authenticated;
grant execute on function public.consume_community_budget(uuid,text,integer) to service_role;

-- Private images: only server-issued expiring links are exposed for visible posts.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('community-photos','community-photos',false,1048576,array['image/jpeg'])
on conflict(id) do nothing;

commit;
