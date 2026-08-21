-- ============================================================
-- Santinho Digital — migração 005 (idempotente)
-- Escolha de quais formatos aparecem para o apoiador.
-- ============================================================

alter table public.candidatos
  add column if not exists formatos_ativos text[] not null
  default array['feed', 'perfil', 'story'];
