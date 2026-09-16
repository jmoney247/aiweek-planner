import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const root = new URL('../', import.meta.url).pathname.replace(/\/$/, '');
const db=new PGlite();
await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
for(const file of ['0001_init.sql','0002_event_images.sql','0003_maps_community.sql']) {
  let sql=fs.readFileSync(root+'/supabase/migrations/'+file,'utf8');
  // gen_random_uuid is built into this PostgreSQL; pgcrypto is not bundled.
  sql=sql.replace('create extension if not exists "pgcrypto";','');
  await db.exec(sql);
}
const one='00000000-0000-4000-8000-000000000001',two='00000000-0000-4000-8000-000000000002';
await db.query('insert into anon_users(id,display_name) values($1,$2),($3,$4)',[one,'Sunny Otter',two,'Friendly Fox']);
await db.exec(`insert into events(id,title,official_url,start_at) values('test-event','Test event','https://example.com',now()+interval '1 day');`);
const photo=await db.query(`insert into event_comments(event_id,user_id,display_name_snapshot,body,photo_paths) values('test-event',$1,'Sunny Otter','',array['photo.jpg']) returning id`,[one]);
const id=photo.rows[0].id;
await assert.rejects(db.exec(`insert into event_comments(event_id,display_name_snapshot,body) values('test-event','Blank','');`));
await db.query(`insert into comment_reactions values($1,$2,'like')`,[id,two]);
assert.equal((await db.query('select likes from community_feed where id=$1',[id])).rows[0].likes,1);
await db.query(`insert into comment_reactions values($1,$2,'dislike') on conflict(comment_id,user_id) do update set reaction=excluded.reaction`,[id,two]);
const updated=(await db.query('select likes,dislikes from community_feed where id=$1',[id])).rows[0];
assert.equal(updated.likes,0);assert.equal(updated.dislikes,1);
await db.query('delete from comment_reactions where comment_id=$1 and user_id=$2',[id,two]);
assert.equal((await db.query('select dislikes from community_feed where id=$1',[id])).rows[0].dislikes,0);
await db.query(`insert into event_attendance(event_id,user_id) values('test-event',$1) on conflict do nothing`,[one]);
await db.query(`insert into event_attendance(event_id,user_id) values('test-event',$1) on conflict do nothing`,[one]);
assert.equal((await db.query('select count(*)::int as n from event_attendance')).rows[0].n,1);
assert.equal((await db.query(`select consume_community_budget($1,'test',1) as allowed`,[one])).rows[0].allowed,true);
assert.equal((await db.query(`select consume_community_budget($1,'test',1) as allowed`,[one])).rows[0].allowed,false);
await db.query(`update event_comments set moderation_state='hidden' where id=$1`,[id]);
assert.equal((await db.query('select count(*)::int as n from community_feed')).rows[0].n,0);
await db.exec('set role anon');
for(const table of ['community_feed','comment_reactions','event_attendance','website_feedback','community_write_budgets']) await assert.rejects(db.exec('select * from '+table));
await db.exec('reset role');
await assert.rejects(db.exec(`update events set lat=42.3,lng=null where id='test-event'`));
await db.exec(fs.readFileSync(root+'/supabase/map-coordinate-updates.sql','utf8'));
console.log('PASS: migrations, photo-only posts, empty-post rejection, reaction upsert/remove, attendance uniqueness, persistent rate limits, hidden-post exclusion, anonymous access denial, coordinate constraints, and update SQL.');
await db.close();
