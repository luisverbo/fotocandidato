// Cliente da API pública do TSE (DivulgaCandContas).
// Roda no servidor (Vercel), onde a internet é aberta.
//
// A API não tem contrato versionado e o formato das respostas muda entre
// eleições, então tudo aqui é defensivo: tenta mais de um endpoint,
// aceita mais de um formato e nunca lança para cima sem contexto.

import type { CargoCola } from "@/lib/cola/cargos";

const BASE = "https://divulgacandcontas.tse.jus.br/divulga/rest/v1";
const TIMEOUT_MS = 20_000;

// Códigos de cargo do TSE
const CODIGO_CARGO: Record<CargoCola, number> = {
  presidente: 1,
  governador: 3,
  senador: 5,
  deputado_federal: 6,
  deputado_estadual: 7,
  deputado_distrital: 8,
};

export interface CandidatoTse {
  ano: number;
  uf: string;
  cargo: CargoCola;
  numero: string;
  nome_urna: string;
  nome_completo: string | null;
  partido: string | null;
  coligacao: string | null;
  foto_url: string | null;
  sq_candidato: string | null;
  situacao: string | null;
}

async function buscarJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        // A API recusa requisições sem user-agent de navegador.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function comoLista(valor: unknown, ...chaves: string[]): Record<string, unknown>[] {
  if (Array.isArray(valor)) return valor as Record<string, unknown>[];
  if (valor && typeof valor === "object") {
    const obj = valor as Record<string, unknown>;
    for (const chave of chaves) {
      if (Array.isArray(obj[chave])) return obj[chave] as Record<string, unknown>[];
    }
  }
  return [];
}

function texto(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === "string") return valor.trim() || null;
  if (typeof valor === "number") return String(valor);
  return null;
}

// Descobre os IDs das eleições do ano. Em ano de eleição geral há uma
// eleição federal e uma estadual, cada uma com seus cargos.
export async function listarEleicoes(ano: number): Promise<number[]> {
  const respostas = await Promise.all([
    buscarJson(`${BASE}/eleicao/eleicoes-anos/${ano}`),
    buscarJson(`${BASE}/eleicao/listar/${ano}`),
  ]);

  const ids = new Set<number>();

  for (const resposta of respostas) {
    if (!resposta) continue;

    // Formato { anos: [{ ano, eleicoes: [...] }] }
    for (const anoItem of comoLista(resposta, "anos")) {
      for (const eleicao of comoLista(anoItem, "eleicoes")) {
        const id = Number(eleicao.id ?? eleicao.codigo);
        const nome = String(eleicao.nome ?? eleicao.nomeEleicao ?? "");
        // Ignora segundo turno: os candidatos são os mesmos do primeiro.
        if (Number.isFinite(id) && !/2º|2°|segundo/i.test(nome)) ids.add(id);
      }
    }

    // Formato { eleicoes: [...] } ou array direto
    for (const eleicao of comoLista(resposta, "eleicoes")) {
      const id = Number(eleicao.id ?? eleicao.codigo);
      const nome = String(eleicao.nome ?? eleicao.nomeEleicao ?? "");
      if (Number.isFinite(id) && !/2º|2°|segundo/i.test(nome)) ids.add(id);
    }
  }

  return Array.from(ids);
}

function normalizar(
  bruto: Record<string, unknown>,
  ano: number,
  uf: string,
  cargo: CargoCola
): CandidatoTse | null {
  const numero = texto(bruto.numero ?? bruto.numeroUrna);
  const nomeUrna = texto(bruto.nomeUrna ?? bruto.nome ?? bruto.nomeCompleto);
  if (!numero || !nomeUrna) return null;

  const partidoObj = bruto.partido as Record<string, unknown> | undefined;
  const coligacaoObj = bruto.coligacao as Record<string, unknown> | undefined;

  let foto = texto(bruto.fotoUrl ?? bruto.urlFoto ?? bruto.foto);
  if (foto && foto.startsWith("/")) {
    foto = `https://divulgacandcontas.tse.jus.br${foto}`;
  }

  return {
    ano,
    uf,
    cargo,
    numero,
    nome_urna: nomeUrna,
    nome_completo: texto(bruto.nomeCompleto),
    partido: partidoObj ? texto(partidoObj.sigla) : texto(bruto.siglaPartido),
    coligacao: coligacaoObj ? texto(coligacaoObj.nomeColigacao) : null,
    foto_url: foto,
    sq_candidato: texto(bruto.id ?? bruto.sqCandidato),
    situacao: texto(bruto.descricaoSituacao ?? bruto.situacao),
  };
}

export interface ResultadoImportacao {
  candidatos: CandidatoTse[];
  // Para diagnóstico no painel quando algo vier vazio
  tentativas: { url: string; encontrados: number }[];
}

// Busca todos os candidatos de um cargo numa UF.
// Presidente é nacional: usa a abrangência BR.
export async function buscarCandidatosTse(
  ano: number,
  uf: string,
  cargo: CargoCola
): Promise<ResultadoImportacao> {
  const abrangencia = cargo === "presidente" ? "BR" : uf;
  const codigo = CODIGO_CARGO[cargo];
  const eleicoes = await listarEleicoes(ano);

  const tentativas: { url: string; encontrados: number }[] = [];
  const porNumero = new Map<string, CandidatoTse>();

  for (const idEleicao of eleicoes) {
    const url = `${BASE}/candidatura/listar/${ano}/${abrangencia}/${idEleicao}/${codigo}/candidatos`;
    const resposta = await buscarJson(url);
    const brutos = comoLista(resposta, "candidatos");
    tentativas.push({ url, encontrados: brutos.length });

    for (const bruto of brutos) {
      const candidato = normalizar(bruto, ano, abrangencia, cargo);
      if (!candidato) continue;
      // Candidatura indeferida/renunciada só entra se o número estiver livre
      const existente = porNumero.get(candidato.numero);
      if (!existente || /deferido/i.test(candidato.situacao ?? "")) {
        porNumero.set(candidato.numero, candidato);
      }
    }
  }

  return { candidatos: Array.from(porNumero.values()), tentativas };
}
