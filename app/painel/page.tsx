import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site";
import type { Candidato } from "@/lib/types";
import CopiarLink from "@/components/painel/CopiarLink";
import QrCodeLink from "@/components/painel/QrCodeLink";

export const dynamic = "force-dynamic";

type CandidatoComContagem = Candidato & { geracoes: { count: number }[] };

export default async function PainelPage() {
  const supabase = supabaseServer();
  const { data } = await supabase
    .from("candidatos")
    .select("*, geracoes(count)")
    .order("created_at", { ascending: false });

  const candidatos = (data ?? []) as CandidatoComContagem[];
  const base = siteUrl();

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Candidatos</h1>
        <Link
          href="/painel/novo"
          className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-zinc-200"
        >
          Novo candidato
        </Link>
      </div>

      {candidatos.length === 0 ? (
        <div className="mt-16 rounded-xl border border-dashed border-zinc-700 p-12 text-center">
          <p className="text-lg font-semibold text-zinc-300">
            Nenhum candidato ainda
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            Cadastre o primeiro candidato para gerar o link exclusivo dele.
          </p>
          <Link
            href="/painel/novo"
            className="mt-6 inline-block rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950"
          >
            Cadastrar candidato
          </Link>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {candidatos.map((c) => {
            const url = `${base}/c/${c.slug}`;
            const artes = c.geracoes?.[0]?.count ?? 0;
            return (
              <li
                key={c.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold text-white">
                      {c.nome}
                    </p>
                    <p className="text-sm text-zinc-400">
                      {c.cargo}
                      {c.partido ? ` · ${c.partido}` : ""}
                    </p>
                  </div>
                  <span
                    className="shrink-0 rounded-md px-3 py-1 font-display text-xl font-extrabold"
                    style={{
                      backgroundColor: c.cor_primaria,
                      color: "#ffffff",
                    }}
                  >
                    {c.numero}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-2 text-sm">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      c.ativo
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-red-500/15 text-red-400"
                    }`}
                  >
                    {c.ativo ? "Ativo" : "Inativo"}
                  </span>
                  <span className="text-zinc-400">
                    {artes} {artes === 1 ? "arte gerada" : "artes geradas"}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <CopiarLink url={url} />
                  <QrCodeLink url={url} slug={c.slug} />
                  <Link
                    href={`/painel/${c.id}`}
                    className="rounded-md border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-800"
                  >
                    Editar
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
