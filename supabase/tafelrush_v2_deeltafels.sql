-- ===========================================================================
-- Tafel Rush – update 2: deeltafels (uitvoeren NA tafelrush_schema.sql)
-- ===========================================================================
-- Wat het doet (alleen binnen schema "tafelrush", niets daarbuiten):
--   • tabel runs krijgt kolom "operation": soort sommen van de run
--     ('mul' = tafels, 'div' = deeltafels). Bestaande runs krijgen 'mul'.
--   • nieuwe view personal_bests_by_operation: records per soort sommen.
-- Veilig om vaker uit te voeren; er gaan geen gegevens verloren.
-- ===========================================================================

begin;

alter table tafelrush.runs
  add column if not exists operation text not null default 'mul';

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'runs_operation_check' and conrelid = 'tafelrush.runs'::regclass
  ) then
    alter table tafelrush.runs
      add constraint runs_operation_check check (operation in ('mul', 'div'));
  end if;
end;
$$;

comment on column tafelrush.runs.operation is 'Soort sommen: mul = tafels, div = deeltafels.';

create or replace view tafelrush.personal_bests_by_operation
with (security_invoker = true) as
select
  r.user_id,
  r.operation,
  count(*)                                                  as runs,
  count(*) filter (where r.completed)                       as bosses_defeated,
  max(r.correct)                                            as most_correct,
  max(r.best_combo)                                         as best_combo,
  min(r.avg_rt_ms) filter (where r.correct >= 15 and r.avg_rt_ms > 0) as fastest_avg_rt_ms,
  max(r.correct::numeric / nullif(r.answered, 0)) filter (where r.answered >= 20) as best_accuracy,
  sum(r.answered)                                           as total_answered,
  sum(r.correct)                                            as total_correct,
  max(r.played_at)                                          as last_played_at
from tafelrush.runs r
group by r.user_id, r.operation;
comment on view tafelrush.personal_bests_by_operation is 'Persoonlijke records per speler en per soort sommen.';

revoke all on tafelrush.personal_bests_by_operation from anon, public;
grant select on tafelrush.personal_bests_by_operation to authenticated;
grant all on tafelrush.personal_bests_by_operation to service_role;

commit;

-- de Supabase API meteen de nieuwe kolom laten zien
notify pgrst, 'reload schema';

-- ===========================================================================
-- Controle (los uitvoeren, verandert niets):
--   select column_name, data_type, column_default from information_schema.columns
--    where table_schema = 'tafelrush' and table_name = 'runs' and column_name = 'operation';
-- ===========================================================================
