begin;

-- Enroll only an existing, verified Supabase Auth account. Public visitor
-- profiles in anon_users are deliberately unrelated to this allowlist.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table private.admin_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table private.admin_accounts enable row level security;
revoke all on private.admin_accounts from public, anon, authenticated;
insert into private.admin_accounts(user_id)
select id from auth.users
where lower(email) = 'joshua19solomon@gmail.com' and email_confirmed_at is not null;

-- This is the sole analytics read interface. Caller JWT identity is checked
-- inside PostgreSQL before any aggregate runs; no service-role browser access.
create function public.admin_analytics()
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from private.admin_accounts a
    join auth.users u on u.id = a.user_id
    where a.user_id = auth.uid()
      and lower(u.email) = 'joshua19solomon@gmail.com'
      and u.email_confirmed_at is not null
  ) then
    raise exception 'Admin access denied' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'events', (select count(*) from public.events),
    'mapped_events', (select count(*) from public.events where lat is not null and lng is not null),
    'browser_profiles', (select count(*) from public.anon_users),
    'visible_comments', (select count(*) from public.event_comments where not is_deleted and moderation_state = 'visible'),
    'shared_photos', (select coalesce(sum(cardinality(photo_paths)),0) from public.event_comments where not is_deleted and moderation_state = 'visible'),
    'event_likes', (select count(*) from public.event_reactions where reaction = 'like'),
    'event_dislikes', (select count(*) from public.event_reactions where reaction = 'dislike'),
    'comment_likes', (select count(*) from public.comment_reactions where reaction = 'like'),
    'comment_dislikes', (select count(*) from public.comment_reactions where reaction = 'dislike'),
    'planned_attendance', (select count(*) from public.event_attendance),
    'website_feedback', (select count(*) from public.website_feedback),
    'generated_at', now()
  );
end;
$$;
revoke all on function public.admin_analytics() from public, anon, authenticated;
grant execute on function public.admin_analytics() to authenticated;
commit;
