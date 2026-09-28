-- ============================================================
-- Santinho Digital — migração 007 (idempotente)
-- Cola Digital: cache dos candidatos oficiais do TSE.
-- Cole no SQL Editor do Supabase e execute.
-- ============================================================

create table if not exists public.tse_candidatos (
  id            uuid primary key default gen_random_uuid(),
  ano           int  not null,
  uf            text not null,          -- 'BR' para presidente
  cargo         text not null,          -- presidente, governador, senador, deputado_federal, deputado_estadual, deputado_distrital
  numero        text not null,
  nome_urna     text not null,
  nome_completo text,
  partido       text,
  coligacao     text,
  foto_url      text,
  sq_candidato  text,
  situacao      text,
  atualizado_em timestamptz not null default now()
);

-- Um candidato por número dentro do mesmo ano/UF/cargo
create unique index if not exists tse_candidatos_chave_idx
  on public.tse_candidatos (ano, uf, cargo, numero);

create index if not exists tse_candidatos_busca_idx
  on public.tse_candidatos (ano, uf, cargo);

alter table public.tse_candidatos enable row level security;

-- Qualquer pessoa consulta (a cola é pública, sem login)
drop policy if exists "leitura publica dos candidatos do tse" on public.tse_candidatos;
create policy "leitura publica dos candidatos do tse"
  on public.tse_candidatos
  for select
  to anon, authenticated
  using (true);

-- A importação roda logada, pelo painel
drop policy if exists "organizador importa candidatos do tse" on public.tse_candidatos;
create policy "organizador importa candidatos do tse"
  on public.tse_candidatos
  for all
  to authenticated
  using (true)
  with check (true);

-- ---------- Métrica de uso da cola (sem dado pessoal) ----------
create table if not exists public.colas_geradas (
  id         uuid primary key default gen_random_uuid(),
  uf         text not null,
  acao       text not null check (acao in ('pdf', 'imagem', 'share')),
  qtd_cargos int  not null default 0,
  created_at timestamptz not null default now()
);

alter table public.colas_geradas enable row level security;

drop policy if exists "insert publico de colas" on public.colas_geradas;
create policy "insert publico de colas"
  on public.colas_geradas
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "leitura logada de colas" on public.colas_geradas;
create policy "leitura logada de colas"
  on public.colas_geradas
  for select
  to authenticated
  using (true);
