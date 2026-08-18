# Santinho Digital

SaaS para campanhas: cadastre candidatos, gere um link exclusivo por candidato
e deixe os apoiadores colocarem a própria foto numa arte de campanha — direto
no navegador do celular, sem enviar a foto para nenhum servidor.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Supabase (Postgres + Auth + Storage)
- Canvas API nativa (geração de imagem 100% no client)
- Deploy na Vercel

## Rotas

| Rota | O que é |
| --- | --- |
| `/` | Landing do produto |
| `/login` | Login/cadastro (Supabase Auth, e-mail + senha) |
| `/painel` | Lista de candidatos do organizador |
| `/painel/novo` | Cadastro com preview ao vivo |
| `/painel/[id]` | Edição + métricas + link/QR Code |
| `/c/[slug]` | Página pública do candidato (o link que viraliza) |

## Colocar em produção

### 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Abra **SQL Editor**, cole o conteúdo de
   [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql) e execute.
   Isso cria as tabelas `candidatos` e `geracoes`, todas as políticas RLS e o
   bucket público `logos`.
3. Em **Authentication → Providers**, confirme que **Email** está habilitado.
   Se quiser login imediato sem confirmação de e-mail, desative
   "Confirm email".

### 2. Vercel

1. Importe este repositório na Vercel.
2. Configure as variáveis de ambiente (valores em
   *Supabase → Project Settings → API*):

   | Variável | Valor |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://SEU-PROJETO.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon/public key |
   | `NEXT_PUBLIC_SITE_URL` | URL final do app (ex.: `https://santinho.seudominio.com`) |

3. Deploy. Pronto: crie sua conta em `/login` e cadastre o primeiro candidato.

## Sistema de templates

Cada template é um módulo isolado em `lib/templates/` que exporta:

```ts
export const template: Template = {
  id: "faixa",
  nome: "Faixa",
  suporta: ["feed", "story"],
  draw(ctx, { W, H, u, foto, candidato, formato }) { ... },
};
```

Para adicionar um template novo: crie o arquivo e acrescente uma linha em
`lib/templates/index.ts`. Nenhum componente de UI precisa mudar. Todo desenho
usa a unidade `u = W / 1080` para escalar entre feed (1080×1080) e story
(1080×1920) — nada de pixel absoluto.

Templates prontos: **Faixa**, **Selo**, **Borda**, **Diagonal**, **Recorte**
e **Minimal**.

## Privacidade

A foto do apoiador é lida com `createImageBitmap` (corrigindo orientação
EXIF), reduzida no próprio aparelho e desenhada num canvas local. O arquivo
final sai por `navigator.share` ou download — nenhum byte da foto passa pelo
servidor. A única escrita no banco é a métrica anônima em `geracoes`
(template, formato e ação).
