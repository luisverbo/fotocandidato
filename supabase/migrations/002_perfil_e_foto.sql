-- ============================================================
-- Santinho Digital — migração 002
-- Foto do candidato + formato "perfil" nas métricas.
-- Cole no SQL Editor do Supabase e execute (depois da 001).
-- ============================================================

-- Foto do candidato (aparece no topo da página pública)
alter table public.candidatos
  add column if not exists foto_url text;

-- Novo formato de arte: perfil (foto de perfil redonda)
alter table public.geracoes
  drop constraint if exists geracoes_formato_check;

alter table public.geracoes
  add constraint geracoes_formato_check
  check (formato in ('feed', 'story', 'perfil'));
