# Joshua Solomon admin setup

This feature is not active until the database migration is applied. No production database change was made while implementing it.

1. In Supabase Authentication, invite/create Joshua's account using `joshua19solomon@gmail.com`. Joshua must verify ownership through the email flow. Do not share passwords or sign-in links in chat.
2. In Authentication URL Configuration, set the production Site URL and allow the exact `https://YOUR-SITE/admin` redirect. Add an exact trusted preview `/admin` URL only if needed. Do not allow broad untrusted wildcard redirects.
3. After approving the additive database change, run `supabase/migrations/0004_private_admin.sql` once in the Supabase SQL editor. It creates a private account allowlist and a restricted analytics function; it does not alter events or community data. The migration enrolls Joshua only if his verified Auth account already exists.
4. If the migration ran before account verification, enroll the now-verified account using the following owner-only SQL:

```sql
insert into private.admin_accounts(user_id)
select id from auth.users
where lower(email) = 'joshua19solomon@gmail.com'
  and email_confirmed_at is not null
on conflict do nothing;
```

5. Visit `/admin`, request a one-time link, and open it in the same browser that requested it (PKCE). Alternatively, use Joshua's existing Supabase Auth password. Configure Supabase email delivery/SMTP if emails cannot be delivered to this address. No signup or auto-created account is exposed by the page.
6. Verify in a signed-out browser that only the login form appears. An unrelated authenticated account must receive an access-denied error from `admin_analytics`, even when calling the database directly. Sign out on shared computers.

## Security boundaries

- The dashboard uses the public Supabase key plus Joshua's authenticated JWT, never the service-role key.
- PostgreSQL checks `auth.uid()` against the private allowlist and the current verified email in `auth.users`. User-editable profile metadata is never trusted for authorization.
- Public and anonymous execution are revoked. Authenticated users may call the function, but only the enrolled Joshua account passes its internal authorization check. Raw private tables remain inaccessible.
- Accounts are pinned by UUID: deleting/recreating an account with the same email does not automatically grant access. To revoke access, delete its row from `private.admin_accounts` using the SQL editor.
- The analytics are on-demand aggregate counts. No new visitor tracking, personal-data export, or moderation controls are included. Existing public event/comment counts remain public as before.
- Admin auth is stored separately from anonymous browser profiles. The `/admin` URL and noindex metadata are not access controls. All actual analytics reads are authorized in PostgreSQL.
- Run `node scripts/test-admin-security.mjs` for database permission tests. Real email delivery and login require testing against the configured Supabase project after setup.

References: https://supabase.com/docs/guides/auth/auth-email-passwordless and https://supabase.com/docs/guides/database/functions
