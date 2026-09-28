import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { buscarCandidatosTse } from "@/lib/tse";
import type { CargoCola } from "@/lib/cola/cargos";

export const runtime = "nodejs";
export const maxDuration = 60;

const CARGOS_VALIDOS: CargoCola[] = [
  "presidente",
  "governador",
  "senador",
  "deputado_federal",
  "deputado_estadual",
  "deputado_distrital",
];

// Importa os candidatos oficiais de um cargo para o banco.
// Um cargo por chamada: assim cada requisição termina dentro do limite
// de tempo da Vercel, e o painel mostra o progresso.
export async function POST(request: Request) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ erro: "Faça login no painel." }, { status: 401 });
  }

  let corpo: { ano?: number; uf?: string; cargo?: string; idsEleicao?: number[] };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }

  const ano = Number(corpo.ano);
  const uf = String(corpo.uf ?? "").toUpperCase();
  const cargo = corpo.cargo as CargoCola;

  if (!Number.isFinite(ano) || !uf || !CARGOS_VALIDOS.includes(cargo)) {
    return NextResponse.json(
      { erro: "Informe ano, uf e cargo válidos." },
      { status: 400 }
    );
  }

  const idsEleicao = Array.isArray(corpo.idsEleicao)
    ? corpo.idsEleicao.map(Number).filter(Number.isFinite)
    : undefined;

  const { candidatos, tentativas } = await buscarCandidatosTse(
    ano,
    uf,
    cargo,
    idsEleicao
  );

  if (candidatos.length === 0) {
    return NextResponse.json({
      ok: false,
      gravados: 0,
      erro:
        tentativas[0]?.encontrados === -1
          ? "Não foi possível descobrir o ID da eleição no TSE. Use o Diagnóstico e informe o ID manualmente."
          : "O TSE não retornou candidatos para este cargo.",
      tentativas,
    });
  }

  // Grava em blocos para não estourar o tamanho da requisição
  let gravados = 0;
  for (let i = 0; i < candidatos.length; i += 500) {
    const bloco = candidatos.slice(i, i + 500);
    const { error } = await supabase
      .from("tse_candidatos")
      .upsert(bloco, { onConflict: "ano,uf,cargo,numero" });
    if (error) {
      return NextResponse.json(
        {
          ok: false,
          gravados,
          erro: `Erro ao gravar no banco: ${error.message}`,
          tentativas,
        },
        { status: 500 }
      );
    }
    gravados += bloco.length;
  }

  return NextResponse.json({ ok: true, gravados, tentativas });
}
