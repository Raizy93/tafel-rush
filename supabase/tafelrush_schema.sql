-- ===========================================================================
-- Tafel Rush – databaseschema voor Supabase (schema "tafelrush")
-- ===========================================================================
-- Veilig voor een BESTAANDE Supabase-database:
--   • maakt alleen een NIEUW schema "tafelrush" met eigen tabellen aan;
--   • wijzigt of verwijdert niets in andere schema's (public, auth, …);
--   • kan vaker worden uitgevoerd: bestaat iets al, dan wordt het overgeslagen
--     of (alleen binnen tafelrush) opnieuw ingesteld; er gaan geen gegevens verloren.
--
-- Accounts: Supabase Auth (auth.users) is het centrale accountsysteem voor
-- alle games van MeesterDanny.com. Dit script leest daar alleen uit (de
-- verwijzing user_id → auth.users) en voegt er niets aan toe.
--
-- Opbouw:
--   players   1 rij per speler: gebruikersnaam/schermnaam (geen echte naam nodig)
--   saves     de complete spelvoortgang (het profielobject van de game, JSONB)
--   runs      elke gespeelde run (geschiedenis, highscores, statistieken)
--   pets      verzamelde pets
--   worlds    vrijgespeelde werelden + aantal keer de boss verslagen
--   personal_bests  (view) persoonlijke records, berekend uit runs
--   save_progress() opslaan met conflictcontrole (twee apparaten tegelijk)
-- ===========================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Schema
-- ---------------------------------------------------------------------------
create schema if not exists tafelrush;
comment on schema tafelrush is 'Tafel Rush (MeesterDanny.com): spelers, voortgang, runs, pets en werelden.';

-- ---------------------------------------------------------------------------
-- 2. Hulpfunctie: updated_at automatisch bijwerken
-- ---------------------------------------------------------------------------
create or replace function tafelrush.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Tabellen
-- ---------------------------------------------------------------------------

-- 3a. Spelers (1 per account). Verwijder je het account in Supabase Auth, dan
--     verdwijnt alle Tafel Rush-data mee (on delete cascade).
create table if not exists tafelrush.players (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  username      text not null unique
                check (username ~ '^[a-z0-9_]{3,20}$'),          -- kleine letters, cijfers, _
  display_name  text not null
                check (char_length(btrim(display_name)) between 1 and 30),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  last_seen_at  timestamptz
);
comment on table tafelrush.players is 'Eén rij per speler. Bewust geen echte naam, school of e-mail.';

-- 3b. Voortgang: het volledige profielobject van de game (js/storage/profileSchema.js).
--     De game blijft de baas over het formaat en de migraties (profile_version).
create table if not exists tafelrush.saves (
  user_id          uuid primary key references tafelrush.players (user_id) on delete cascade,
  data             jsonb not null
                   check (jsonb_typeof(data) = 'object')
                   check (pg_column_size(data) < 1048576),         -- max. 1 MB
  profile_version  integer not null check (profile_version >= 1),
  revision         bigint  not null default 1 check (revision >= 1),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
comment on table tafelrush.saves is 'Complete spelvoortgang per speler (JSONB). revision telt op bij elke save (conflictcontrole).';

-- 3c. Runs: elke gespeelde run. Alleen toevoegen en lezen (niet wijzigen).
create table if not exists tafelrush.runs (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references tafelrush.players (user_id) on delete cascade,
  client_run_id  uuid not null,                                   -- door de game gemaakt: dubbel insturen = geen dubbele run
  played_at      timestamptz not null default now(),
  mode           text not null check (mode in ('training', 'mix', 'power', 'hard')),
  world          text not null check (world ~ '^[a-z0-9_]{1,40}$'),
  tables         smallint[] not null default '{}'
                 check (tables <@ array[1,2,3,4,5,6,7,8,9,10]::smallint[]),
  completed      boolean not null default false,                  -- boss verslagen
  answered       integer not null default 0 check (answered >= 0),
  correct        integer not null default 0 check (correct >= 0 and correct <= answered),
  perfect        integer not null default 0 check (perfect >= 0 and perfect <= correct),
  best_combo     integer not null default 0 check (best_combo >= 0),
  avg_rt_ms      integer not null default 0 check (avg_rt_ms >= 0),
  coins          integer not null default 0 check (coins >= 0),
  duration_ms    integer not null default 0 check (duration_ms >= 0),
  unique (user_id, client_run_id)
);
create index if not exists runs_user_played_idx on tafelrush.runs (user_id, played_at desc);
comment on table tafelrush.runs is 'Geschiedenis van runs: basis voor highscores en statistieken.';

-- 3d. Verzamelde pets
create table if not exists tafelrush.pets (
  user_id   uuid not null references tafelrush.players (user_id) on delete cascade,
  pet_id    text not null check (pet_id ~ '^[a-z0-9_]{1,40}$'),
  found_at  timestamptz not null default now(),
  primary key (user_id, pet_id)
);
comment on table tafelrush.pets is 'Welke pets een speler heeft gevonden (en wanneer).';

-- 3e. Werelden
create table if not exists tafelrush.worlds (
  user_id          uuid not null references tafelrush.players (user_id) on delete cascade,
  world_id         text not null check (world_id ~ '^[a-z0-9_]{1,40}$'),
  unlocked_at      timestamptz not null default now(),
  bosses_defeated  integer not null default 0 check (bosses_defeated >= 0),
  updated_at       timestamptz not null default now(),
  primary key (user_id, world_id)
);
comment on table tafelrush.worlds is 'Vrijgespeelde werelden en hoe vaak de boss daar verslagen is.';

-- ---------------------------------------------------------------------------
-- 4. Triggers (alleen op tafelrush-tabellen)
-- ---------------------------------------------------------------------------
drop trigger if exists players_set_updated_at on tafelrush.players;
create trigger players_set_updated_at before update on tafelrush.players
  for each row execute function tafelrush.set_updated_at();

drop trigger if exists saves_set_updated_at on tafelrush.saves;
create trigger saves_set_updated_at before update on tafelrush.saves
  for each row execute function tafelrush.set_updated_at();

drop trigger if exists worlds_set_updated_at on tafelrush.worlds;
create trigger worlds_set_updated_at before update on tafelrush.worlds
  for each row execute function tafelrush.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Row Level Security: een speler ziet en wijzigt alleen zijn eigen rijen
--    ((select auth.uid()) = sneller dan auth.uid() per rij)
-- ---------------------------------------------------------------------------
alter table tafelrush.players enable row level security;
alter table tafelrush.saves   enable row level security;
alter table tafelrush.runs    enable row level security;
alter table tafelrush.pets    enable row level security;
alter table tafelrush.worlds  enable row level security;

-- players: lezen, aanmaken, wijzigen en (eigen speldata) verwijderen
drop policy if exists "players: eigen rij lezen"      on tafelrush.players;
drop policy if exists "players: eigen rij aanmaken"   on tafelrush.players;
drop policy if exists "players: eigen rij wijzigen"   on tafelrush.players;
drop policy if exists "players: eigen rij verwijderen" on tafelrush.players;
create policy "players: eigen rij lezen" on tafelrush.players
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "players: eigen rij aanmaken" on tafelrush.players
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "players: eigen rij wijzigen" on tafelrush.players
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "players: eigen rij verwijderen" on tafelrush.players
  for delete to authenticated using ((select auth.uid()) = user_id);

-- saves: lezen, aanmaken, wijzigen (geen los verwijderen; dat gaat via players)
drop policy if exists "saves: eigen voortgang lezen"    on tafelrush.saves;
drop policy if exists "saves: eigen voortgang aanmaken" on tafelrush.saves;
drop policy if exists "saves: eigen voortgang wijzigen" on tafelrush.saves;
create policy "saves: eigen voortgang lezen" on tafelrush.saves
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "saves: eigen voortgang aanmaken" on tafelrush.saves
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "saves: eigen voortgang wijzigen" on tafelrush.saves
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- runs: alleen lezen en toevoegen
drop policy if exists "runs: eigen runs lezen"    on tafelrush.runs;
drop policy if exists "runs: eigen run toevoegen" on tafelrush.runs;
create policy "runs: eigen runs lezen" on tafelrush.runs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "runs: eigen run toevoegen" on tafelrush.runs
  for insert to authenticated with check ((select auth.uid()) = user_id);

-- pets: alleen lezen en toevoegen (een gevonden pet blijft van jou)
drop policy if exists "pets: eigen pets lezen"    on tafelrush.pets;
drop policy if exists "pets: eigen pet toevoegen" on tafelrush.pets;
create policy "pets: eigen pets lezen" on tafelrush.pets
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "pets: eigen pet toevoegen" on tafelrush.pets
  for insert to authenticated with check ((select auth.uid()) = user_id);

-- worlds: lezen, toevoegen, bijwerken (aantal bosses)
drop policy if exists "worlds: eigen werelden lezen"     on tafelrush.worlds;
drop policy if exists "worlds: eigen wereld toevoegen"   on tafelrush.worlds;
drop policy if exists "worlds: eigen wereld bijwerken"   on tafelrush.worlds;
create policy "worlds: eigen werelden lezen" on tafelrush.worlds
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "worlds: eigen wereld toevoegen" on tafelrush.worlds
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "worlds: eigen wereld bijwerken" on tafelrush.worlds
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- 6. Highscores: persoonlijke records (view; RLS van runs geldt hier ook)
-- ---------------------------------------------------------------------------
create or replace view tafelrush.personal_bests
with (security_invoker = true) as
select
  r.user_id,
  count(*)                                                  as runs,
  count(*) filter (where r.completed)                       as bosses_defeated,
  max(r.correct)                                            as most_correct,
  max(r.best_combo)                                         as best_combo,
  min(r.avg_rt_ms) filter (where r.correct >= 15 and r.avg_rt_ms > 0) as fastest_avg_rt_ms,
  max(r.correct::numeric / nullif(r.answered, 0)) filter (where r.answered >= 20) as best_accuracy,
  sum(r.answered)                                           as total_answered,
  sum(r.correct)                                            as total_correct,
  sum(r.duration_ms)                                        as total_play_ms,
  max(r.played_at)                                          as last_played_at
from tafelrush.runs r
group by r.user_id;
comment on view tafelrush.personal_bests is 'Persoonlijke records per speler, berekend uit runs.';

-- ---------------------------------------------------------------------------
-- 7. Opslaan met conflictcontrole
--    De game stuurt mee welke revision hij als laatste kende. Heeft een ander
--    apparaat intussen opgeslagen, dan wordt er NIET overschreven en krijgt de
--    game saved = false terug (dan kan hij de speler laten kiezen).
-- ---------------------------------------------------------------------------
create or replace function tafelrush.save_progress(
  p_data jsonb,
  p_profile_version integer,
  p_expected_revision bigint
)
returns table (saved boolean, current_revision bigint, saved_at timestamptz)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_rev bigint;
begin
  if v_uid is null then
    raise exception 'Niet ingelogd' using errcode = '42501';
  end if;

  insert into tafelrush.saves as s (user_id, data, profile_version, revision)
  values (v_uid, p_data, p_profile_version, 1)
  on conflict (user_id) do update
     set data            = excluded.data,
         profile_version = excluded.profile_version,
         revision        = s.revision + 1
   where s.revision = p_expected_revision
  returning s.revision into v_rev;

  return query
    select v_rev is not null, s.revision, s.updated_at
      from tafelrush.saves s
     where s.user_id = v_uid;
end;
$$;
comment on function tafelrush.save_progress(jsonb, integer, bigint) is 'Voortgang opslaan; overschrijft alleen als p_expected_revision klopt.';

-- ---------------------------------------------------------------------------
-- 8. Rechten voor de Supabase API
--    anon (niet ingelogd) krijgt GEEN toegang tot de tabellen.
--    authenticated (ingelogd) krijgt alleen wat nodig is; RLS beperkt tot eigen rijen.
--    service_role (alleen server/dashboard, nooit in de game) mag alles.
-- ---------------------------------------------------------------------------
grant usage on schema tafelrush to anon, authenticated, service_role;

-- eerst alles intrekken (ook eventuele standaardrechten), daarna precies geven wat nodig is
revoke all on all tables    in schema tafelrush from anon, authenticated, public;
revoke all on all sequences in schema tafelrush from anon, authenticated, public;
revoke all on all functions in schema tafelrush from anon, authenticated, public;

grant select, insert, update, delete on tafelrush.players to authenticated;
grant select, insert, update         on tafelrush.saves   to authenticated;
grant select, insert                 on tafelrush.runs    to authenticated;
grant select, insert                 on tafelrush.pets    to authenticated;
grant select, insert, update         on tafelrush.worlds  to authenticated;
grant select                         on tafelrush.personal_bests to authenticated;
grant execute on function tafelrush.save_progress(jsonb, integer, bigint) to authenticated;
grant usage on all sequences in schema tafelrush to authenticated;   -- teller van runs.id

grant all on all tables    in schema tafelrush to service_role;
grant all on all sequences in schema tafelrush to service_role;
grant all on all functions in schema tafelrush to service_role;

commit;

-- ===========================================================================
-- Controle (los uitvoeren, verandert niets): welke tabellen staan er en is RLS aan?
--
--   select tablename, rowsecurity from pg_tables where schemaname = 'tafelrush' order by tablename;
-- ===========================================================================
