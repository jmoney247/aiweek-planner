import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const db = new PGlite();
await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
insert into auth.users values ('00000000-0000-4000-8000-000000000001','joshua19solomon@gmail.com',now()),('00000000-0000-4000-8000-000000000002','other@example.com',now());`);
for (const file of ['0001_init.sql', '0002_event_images.sql', '0003_maps_community.sql', '0004_private_admin.sql']) {
  await db.exec(fs.readFileSync(new URL('../supabase/migrations/' + file, import.meta.url), 'utf8').replace('create extension if not exists "pgcrypto";', ''));
}
await db.exec('set role anon');
await assert.rejects(db.exec('select public.admin_analytics()'), /permission denied/);
await db.exec('reset role; set role authenticated');
await assert.rejects(db.exec('select public.admin_analytics()'), /Admin access denied/);
await db.exec(`select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false)`);
await assert.rejects(db.exec('select public.admin_analytics()'), /Admin access denied/);
await assert.rejects(db.exec('select * from private.admin_accounts'), /permission denied/);
await assert.rejects(db.exec(`insert into private.admin_accounts values ('00000000-0000-4000-8000-000000000002')`), /permission denied/);
await db.exec(`select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false)`);
const data = await db.query('select public.admin_analytics() as totals');
assert.equal(data.rows[0].totals.events, 0);
await db.exec(`reset role; update auth.users set email_confirmed_at=null where id='00000000-0000-4000-8000-000000000001'; set role authenticated;`);
await assert.rejects(db.exec('select public.admin_analytics()'), /Admin access denied/);
await db.exec(`reset role; update auth.users set email_confirmed_at=now(); delete from private.admin_accounts; set role authenticated;`);
await assert.rejects(db.exec('select public.admin_analytics()'), /Admin access denied/);
await db.close();
console.log('PASS: anonymous, unrelated account, unverified account, revoked account, and direct allowlist access denied; only enrolled verified Joshua account can read analytics.');
