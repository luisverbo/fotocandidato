import type { Metadata } from "next";
import Link from "next/link";
import { supabaseAnon } from "@/lib/supabase/server";
import type { Candidato, Moldura } from "@/lib/types";
import FluxoApoiador from "@/components/publico/FluxoApoiador";

// Revalida a cada 60s: página pública rápida (menos de 2s no 4G) sem
// perder atualizações do painel por muito tempo.
export const revalidate = 60;

async function buscarCandidato(slug: string): Promise<Candidato | null> {
  const supabase = supabaseAnon();
  const { data } = await supabase
    .from("candidatos")
    .select("*")
    .eq("slug", slug)
    .eq("ativo", true)
    .maybeSingle();
  return (data as Candidato) ?? null;
}

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const candidato = await buscarCandidato(params.slug);
  if (!candidato) {
    return {
      title: "Link não encontrado — Santinho Digital",
      robots: { index: false },
    };
  }

  const titulo = `${candidato.nome} ${candidato.numero} — Coloque sua foto`;
  const descricao = `Apoie ${candidato.nome} (${candidato.cargo}${
    candidato.partido ? `, ${candidato.partido}` : ""
  }). Coloque sua foto na arte da campanha e compartilhe.`;

  return {
    title: titulo,
    description: descricao,
    openGraph: {
      title: titulo,
      description: descricao,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: titulo,
      description: descricao,
    },
  };
}

function LinkIndisponivel() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-4xl font-extrabold uppercase text-neutral-900">
        Link indisponível
      </h1>
      <p className="mt-4 text-lg text-neutral-600">
        Este link não existe ou a campanha está pausada. Confira com quem te
        enviou se o endereço está certo.
      </p>
      <Link
        href="/"
        className="mt-8 min-h-12 rounded-xl border-2 border-neutral-300 px-6 py-3 font-semibold text-neutral-900"
      >
        Conhecer o Santinho Digital
      </Link>
    </main>
  );
}

export default async function PaginaCandidato({ params }: Props) {
  const candidato = await buscarCandidato(params.slug);
  if (!candidato) {
    return <LinkIndisponivel />;
  }

  const { data: molduras } = await supabaseAnon()
    .from("molduras")
    .select("*")
    .eq("candidato_id", candidato.id)
    .order("created_at");

  return (
    <FluxoApoiador
      candidato={candidato}
      molduras={(molduras ?? []) as Moldura[]}
    />
  );
}
