-- ============================================================
-- Santinho Digital — migração 008 (idempotente)
-- Métricas da Cola Digital: acessos, downloads por estado e
-- os números escolhidos em cada cargo.
--
-- Nada aqui identifica a pessoa: não guardamos IP, nome, e-mail
-- nem qualquer identificador. São contagens anônimas.
-- ============================================================

-- ---------- Acessos ----------
create table if not exists public.cola_visitas (
  id         uuid primary key default gen_random_uuid(),
  etapa      text not null check (etapa in ('abriu', 'escolheu_estado')),
  uf         text,
  created_at timestamptz not null default now()
);

create index if not exists cola_visitas_etapa_idx
  on public.cola_visitas (etapa, created_at desc);

alter table public.cola_visitas enable row level security;

drop policy if exists "insert publico de visitas" on public.cola_visitas;
create policy "insert publico de visitas"
  on public.cola_visitas for insert to anon, authenticated with check (true);

drop policy if exists "leitura logada de visitas" on public.cola_visitas;
create policy "leitura logada de visitas"
  on public.cola_visitas for select to authenticated using (true);

-- ---------- Números escolhidos ----------
create table if not exists public.cola_escolhas (
  id         uuid primary key default gen_random_uuid(),
  uf         text not null,
  cargo      text not null,
  numero     text not null,
  nome_urna  text,
  partido    text,
  acao       text not null check (acao in ('pdf', 'imagem', 'share')),
  created_at timestamptz not null default now()
);

create index if not exists cola_escolhas_cargo_idx
  on public.cola_escolhas (cargo, numero);

create index if not exists cola_escolhas_uf_idx
  on public.cola_escolhas (uf);

alter table public.cola_escolhas enable row level security;

drop policy if exists "insert publico de escolhas" on public.cola_escolhas;
create policy "insert publico de escolhas"
  on public.cola_escolhas for insert to anon, authenticated with check (true);

drop policy if exists "leitura logada de escolhas" on public.cola_escolhas;
create policy "leitura logada de escolhas"
  on public.cola_escolhas for select to authenticated using (true);

-- ============================================================
-- Funções de agregação (o painel lê por aqui, não linha a linha)
-- ============================================================

create or replace function public.cola_metricas_resumo()
returns table (
  acessos            bigint,
  estados_escolhidos bigint,
  colas_geradas      bigint,
  pdfs               bigint,
  imagens            bigint,
  compartilhamentos  bigint
)
language sql
security definer
set search_path = public
as $$
  select
    (select count(*) from cola_visitas  where etapa = 'abriu'),
    (select count(*) from cola_visitas  where etapa = 'escolheu_estado'),
    (select count(*) from colas_geradas),
    (select count(*) from colas_geradas where acao = 'pdf'),
    (select count(*) from colas_geradas where acao = 'imagem'),
    (select count(*) from colas_geradas where acao = 'share');
$$;

create or replace function public.cola_metricas_por_estado()
returns table (uf text, acessos bigint, colas bigint)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(v.uf, g.uf)   as uf,
    coalesce(v.qtd, 0)     as acessos,
    coalesce(g.qtd, 0)     as colas
  from
    (select uf, count(*) as qtd
       from cola_visitas
      where etapa = 'escolheu_estado' and uf is not null
      group by uf) v
    full outer join
    (select uf, count(*) as qtd
       from colas_geradas
      where uf is not null
      group by uf) g
    on v.uf = g.uf
  order by 3 desc, 2 desc;
$$;

create or replace function public.cola_metricas_numeros(
  p_cargo  text,
  p_uf     text default null,
  p_limite int  default 20
)
returns table (
  numero    text,
  nome_urna text,
  partido   text,
  total     bigint
)
language sql
security definer
set search_path = public
as $$
  select
    e.numero,
    (array_agg(e.nome_urna order by e.created_at desc))[1] as nome_urna,
    (array_agg(e.partido   order by e.created_at desc))[1] as partido,
    count(*) as total
  from cola_escolhas e
  where e.cargo = p_cargo
    and (p_uf is null or e.uf = p_uf)
  group by e.numero
  order by count(*) desc, e.numero
  limit greatest(p_limite, 1);
$$;

-- Só o painel (usuário logado) consulta as métricas
revoke all on function public.cola_metricas_resumo()            from public, anon;
revoke all on function public.cola_metricas_por_estado()        from public, anon;
revoke all on function public.cola_metricas_numeros(text, text, int) from public, anon;

grant execute on function public.cola_metricas_resumo()            to authenticated;
grant execute on function public.cola_metricas_por_estado()        to authenticated;
grant execute on function public.cola_metricas_numeros(text, text, int) to authenticated;
