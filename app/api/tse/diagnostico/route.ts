import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const BASE = "https://divulgacandcontas.tse.jus.br/divulga/rest/v1";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

interface Sonda {
  url: string;
  status: number | string;
  tipo: string;
  tamanho: number;
  amostra: string;
}

async function sondar(url: string): Promise<Sonda> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": UA },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    const texto = await res.text();
    return {
      url,
      status: res.status,
      tipo: res.headers.get("content-type") ?? "",
      tamanho: texto.length,
      amostra: texto.slice(0, 600),
    };
  } catch (erro) {
    return {
      url,
      status: "falhou",
      tipo: "",
      tamanho: 0,
      amostra: erro instanceof Error ? erro.message : String(erro),
    };
  }
}

// Sonda vários endpoints do TSE e devolve o que cada um respondeu.
// Serve para descobrir o formato atual da API sem precisar adivinhar.
export async function GET(request: Request) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ erro: "Faça login no painel." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const ano = searchParams.get("ano") ?? "2026";
  const uf = (searchParams.get("uf") ?? "RJ").toUpperCase();
  const idEleicao = searchParams.get("idEleicao");

  const urls = [
    `${BASE}/eleicao/eleicoes-anos/${ano}`,
    `${BASE}/eleicao/eleicoes-anos`,
    `${BASE}/eleicao/listar/${ano}`,
    `${BASE}/eleicao/buscar/${uf}/${ano}`,
    // Dados Abertos: se o CDN responder, dá para automatizar a importação
    `https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_${ano}_${uf}.zip`,
    `https://dadosabertos.tse.jus.br/api/3/action/package_show?id=candidatos-${ano}`,
  ];

  // Se já soubermos o id da eleição, testa a listagem de candidatos
  if (idEleicao) {
    urls.push(
      `${BASE}/candidatura/listar/${ano}/${uf}/${idEleicao}/7/candidatos`,
      `${BASE}/candidatura/listar/${ano}/BR/${idEleicao}/1/candidatos`,
      `${BASE}/eleicao/buscar/${uf}/${idEleicao}`
    );
  }

  const sondas: Sonda[] = [];
  for (const url of urls) {
    sondas.push(await sondar(url));
  }

  return NextResponse.json({ ano, uf, idEleicao, sondas });
}
