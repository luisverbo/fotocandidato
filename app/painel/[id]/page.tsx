import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site";
import type { Candidato } from "@/lib/types";
import { templatePorId } from "@/lib/templates";
import CandidatoForm from "@/components/painel/CandidatoForm";
import CopiarLink from "@/components/painel/CopiarLink";
import QrCodeLink from "@/components/painel/QrCodeLink";

export const dynamic = "force-dynamic";

interface Props {
  params: { id: string };
}

export default async function EditarCandidatoPage({ params }: Props) {
  const supabase = supabaseServer();

  const { data: candidato } = await supabase
    .from("candidatos")
    .select("*")
    .eq("id", params.id)
    .maybeSingle<Candidato>();

  if (!candidato) notFound();

  const { data: geracoes } = await supabase
    .from("geracoes")
    .select("template, formato, acao")
    .eq("candidato_id", candidato.id);

  const linhas = geracoes ?? [];
  const total = linhas.length;
  const downloads = linhas.filter((g) => g.acao === "download").length;
  const shares = total - downloads;
  const porTemplate = new Map<string, number>();
  for (const g of linhas) {
    porTemplate.set(g.template, (porTemplate.get(g.template) ?? 0) + 1);
  }
  const ranking = Array.from(porTemplate.entries()).sort((a, b) => b[1] - a[1]);

  const url = `${siteUrl()}/c/${candidato.slug}`;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/painel" className="text-sm text-zinc-500 hover:text-zinc-300">
            ← Candidatos
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-white">
            {candidato.nome}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <CopiarLink url={url} />
          <QrCodeLink url={url} slug={candidato.slug} />
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-800"
          >
            Abrir página
          </a>
        </div>
      </div>

      <p className="mt-2 break-all text-sm text-zinc-500">{url}</p>

      <section aria-label="Métricas" className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-sm text-zinc-400">Artes geradas</p>
          <p className="text-3xl font-bold text-white">{total}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-sm text-zinc-400">Compartilhamentos</p>
          <p className="text-3xl font-bold text-white">{shares}</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-sm text-zinc-400">Downloads</p>
          <p className="text-3xl font-bold text-white">{downloads}</p>
        </div>
      </section>

      {ranking.length > 0 && (
        <section
          aria-label="Modelos mais usados"
          className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900 p-4"
        >
          <p className="text-sm text-zinc-400">Modelos mais usados</p>
          <ul className="mt-2 flex flex-wrap gap-2 text-sm">
            {ranking.map(([id, qtd]) => (
              <li
                key={id}
                className="rounded-md bg-zinc-800 px-3 py-1.5 text-zinc-200"
              >
                {templatePorId(id)?.nome ?? id}:{" "}
                <strong className="text-white">{qtd}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-10">
        <CandidatoForm inicial={candidato} />
      </div>
    </div>
  );
}
