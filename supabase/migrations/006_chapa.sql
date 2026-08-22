-- ============================================================
-- Santinho Digital — migração 006 (idempotente)
-- Chapa: segundo candidato no cabeçalho da página pública e
-- opção de mostrar a foto inteira (arte da dupla).
-- ============================================================

alter table public.candidatos
  add column if not exists parceiro_nome   text,
  add column if not exists parceiro_numero text,
  add column if not exists parceiro_cargo  text,
  add column if not exists foto_inteira    boolean not null default false;
