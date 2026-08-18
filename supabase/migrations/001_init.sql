-- ============================================================
-- Santinho Digital — migração inicial
-- Cole este arquivo inteiro no SQL Editor do Supabase e execute.
-- ============================================================

-- ---------- Tabela: candidatos ----------
create table public.candidatos (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  slug             text not null unique,
  nome             text not null,
  numero           text not null,
  cargo            text not null,
  partido          text,
  slogan           text,
  cor_primaria     text not null default '#1e40af',
  cor_secundaria   text not null default '#fbbf24',
  logo_url         text,
  templates_ativos text[] not null default array['faixa','selo','borda','diagonal','recorte','minimal'],
  ativo            boolean not null default true,
  created_at       timestamptz not null default now()
);

create index candidatos_user_id_idx on public.candidatos (user_id);

alter table public.candidatos enable row level security;

-- Dono (organizador logado) pode tudo nas próprias linhas
create policy "dono gerencia seus candidatos"
  on public.candidatos
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Apoiador (sem login) lê apenas candidatos ativos
create policy "leitura publica de candidatos ativos"
  on public.candidatos
  for select
  to anon
  using (ativo = true);

-- ---------- Tabela: geracoes (métricas, sem dado pessoal) ----------
create table public.geracoes (
  id           uuid primary key default gen_random_uuid(),
  candidato_id uuid not null references public.candidatos (id) on delete cascade,
  template     text not null,
  formato      text not null check (formato in ('feed','story')),
  acao         text not null check (acao in ('download','share')),
  created_at   timestamptz not null default now()
);

create index geracoes_candidato_id_idx on public.geracoes (candidato_id);

alter table public.geracoes enable row level security;

-- Qualquer visitante registra a métrica (fire-and-forget do client)
create policy "insert publico de geracoes"
  on public.geracoes
  for insert
  to anon, authenticated
  with check (true);

-- Só o dono do candidato lê as métricas dele
create policy "dono le metricas dos seus candidatos"
  on public.geracoes
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.candidatos c
      where c.id = geracoes.candidato_id
        and c.user_id = auth.uid()
    )
  );

-- ---------- Storage: bucket público para logos ----------
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

-- Leitura pública (a página do apoiador carrega a logo sem login)
create policy "leitura publica de logos"
  on storage.objects
  for select
  using (bucket_id = 'logos');

-- Usuário logado sobe logo apenas na própria pasta (user_id/arquivo.png)
create policy "upload de logo na propria pasta"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "atualizar logo na propria pasta"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "apagar logo na propria pasta"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
