-- ============================================================
-- Santinho Digital — migração 004 (idempotente)
-- Opção "usar somente as molduras prontas" por candidato.
-- ============================================================

alter table public.candidatos
  add column if not exists apenas_molduras boolean not null default false;
