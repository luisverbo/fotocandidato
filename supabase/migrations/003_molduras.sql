-- ============================================================
-- Santinho Digital — migração 003 (idempotente: pode colar de novo)
-- Molduras prontas: artes enviadas pelo organizador (PNG com área
-- transparente onde entra a foto do apoiador).
-- ============================================================

create table if not exists public.molduras (
  id           uuid primary key default gen_random_uuid(),
  candidato_id uuid not null references public.candidatos (id) on delete cascade,
  nome         text not null,
  formato      text not null check (formato in ('feed', 'story', 'perfil')),
  arquivo_url  text not null,
  created_at   timestamptz not null default now()
);

create index if not exists molduras_candidato_id_idx
  on public.molduras (candidato_id);

alter table public.molduras enable row level security;

drop policy if exists "dono gerencia molduras" on public.molduras;
create policy "dono gerencia molduras"
  on public.molduras
  for all
  to authenticated
  using (
    exists (
      select 1 from public.candidatos c
      where c.id = molduras.candidato_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.candidatos c
      where c.id = molduras.candidato_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "leitura publica de molduras de candidatos ativos" on public.molduras;
create policy "leitura publica de molduras de candidatos ativos"
  on public.molduras
  for select
  to anon
  using (
    exists (
      select 1 from public.candidatos c
      where c.id = molduras.candidato_id
        and c.ativo = true
    )
  );

-- Diagnóstico: mostra o que existe
select m.nome, m.formato, c.slug, c.ativo as candidato_ativo
from public.molduras m
join public.candidatos c on c.id = m.candidato_id;
