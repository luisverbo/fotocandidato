-- ============================================================
-- Santinho Digital — migração 003
-- Molduras prontas: artes enviadas pelo organizador (PNG com área
-- transparente onde entra a foto do apoiador).
-- Cole no SQL Editor do Supabase e execute (depois da 001 e 002).
-- ============================================================

create table public.molduras (
  id           uuid primary key default gen_random_uuid(),
  candidato_id uuid not null references public.candidatos (id) on delete cascade,
  nome         text not null,
  formato      text not null check (formato in ('feed', 'story', 'perfil')),
  arquivo_url  text not null,
  created_at   timestamptz not null default now()
);

create index molduras_candidato_id_idx on public.molduras (candidato_id);

alter table public.molduras enable row level security;

-- Dono do candidato gerencia as molduras dele
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

-- Apoiador (sem login) lê molduras de candidatos ativos
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
