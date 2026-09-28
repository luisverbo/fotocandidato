"use client";

// Importação dos candidatos a partir do arquivo oficial de Dados Abertos
// do TSE (consulta_cand_AAAA_UF.csv, dentro de um .zip).
//
// O arquivo é lido e convertido aqui no navegador porque o TSE bloqueia
// requisições vindas de datacenter (a API pública responde 403 quando
// chamada a partir do servidor).

import type { CargoCola } from "./cargos";

// Códigos de cargo do TSE que interessam para a cola
const CARGO_POR_CODIGO: Record<string, CargoCola> = {
  "1": "presidente",
  "3": "governador",
  "5": "senador",
  "6": "deputado_federal",
  "7": "deputado_estadual",
  "8": "deputado_distrital",
};

export interface LinhaImportada {
  ano: number;
  uf: string;
  cargo: CargoCola;
  numero: string;
  nome_urna: string;
  nome_completo: string | null;
  partido: string | null;
  coligacao: string | null;
  foto_url: null;
  sq_candidato: string | null;
  situacao: string | null;
}

// CSV do TSE: separado por ponto e vírgula, campos entre aspas duplas.
function dividirLinha(linha: string): string[] {
  const campos: string[] = [];
  let atual = "";
  let dentroDeAspas = false;

  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') {
      if (dentroDeAspas && linha[i + 1] === '"') {
        atual += '"';
        i++;
      } else {
        dentroDeAspas = !dentroDeAspas;
      }
    } else if (c === ";" && !dentroDeAspas) {
      campos.push(atual);
      atual = "";
    } else {
      atual += c;
    }
  }
  campos.push(atual);
  return campos;
}

function limpar(valor: string | undefined): string | null {
  if (!valor) return null;
  const v = valor.trim();
  if (!v || v === "#NULO#" || v === "#NE#" || v === "-1") return null;
  return v;
}

export interface ResultadoCsv {
  linhas: LinhaImportada[];
  totalLidas: number;
  ignoradas: number;
  anos: number[];
  ufs: string[];
}

// Converte o conteúdo do CSV nas linhas que vamos gravar no banco.
export function lerCsvTse(texto: string): ResultadoCsv {
  const linhasTexto = texto.split(/\r?\n/);
  if (linhasTexto.length < 2) {
    return { linhas: [], totalLidas: 0, ignoradas: 0, anos: [], ufs: [] };
  }

  const cabecalho = dividirLinha(linhasTexto[0]).map((c) =>
    c.replace(/"/g, "").trim().toUpperCase()
  );
  const col = (nome: string) => cabecalho.indexOf(nome);

  const iAno = col("ANO_ELEICAO");
  const iTurno = col("NR_TURNO");
  const iUf = col("SG_UF");
  const iCargo = col("CD_CARGO");
  const iNumero = col("NR_CANDIDATO");
  const iNomeUrna = col("NM_URNA_CANDIDATO");
  const iNome = col("NM_CANDIDATO");
  const iPartido = col("SG_PARTIDO");
  const iColigacao = col("NM_COLIGACAO");
  const iSq = col("SQ_CANDIDATO");
  const iSituacao = col("DS_SITUACAO_CANDIDATURA");

  if (iNumero < 0 || iCargo < 0 || iNomeUrna < 0) {
    throw new Error(
      "Este arquivo não parece ser o consulta_cand do TSE (colunas não encontradas)."
    );
  }

  // Mantém um candidato por (uf, cargo, número), preferindo o deferido
  const mapa = new Map<string, LinhaImportada>();
  const anos = new Set<number>();
  const ufs = new Set<string>();
  let totalLidas = 0;
  let ignoradas = 0;

  for (let i = 1; i < linhasTexto.length; i++) {
    const bruta = linhasTexto[i];
    if (!bruta.trim()) continue;
    totalLidas++;

    const campos = dividirLinha(bruta);
    const cargo = CARGO_POR_CODIGO[limpar(campos[iCargo]) ?? ""];
    const turno = limpar(campos[iTurno]);
    const numero = limpar(campos[iNumero]);
    const nomeUrna = limpar(campos[iNomeUrna]);

    if (!cargo || !numero || !nomeUrna || (turno && turno !== "1")) {
      ignoradas++;
      continue;
    }

    const ano = Number(limpar(campos[iAno]) ?? 0);
    // Presidente é nacional: guardamos sob a abrangência BR
    const uf =
      cargo === "presidente" ? "BR" : (limpar(campos[iUf]) ?? "").toUpperCase();
    if (!ano || !uf) {
      ignoradas++;
      continue;
    }

    const situacao = limpar(campos[iSituacao]);
    const registro: LinhaImportada = {
      ano,
      uf,
      cargo,
      numero,
      nome_urna: nomeUrna,
      nome_completo: limpar(campos[iNome]),
      partido: limpar(campos[iPartido]),
      coligacao: iColigacao >= 0 ? limpar(campos[iColigacao]) : null,
      foto_url: null,
      sq_candidato: iSq >= 0 ? limpar(campos[iSq]) : null,
      situacao,
    };

    anos.add(ano);
    ufs.add(uf);

    const chave = `${ano}|${uf}|${cargo}|${numero}`;
    const existente = mapa.get(chave);
    if (!existente || /deferido/i.test(situacao ?? "")) {
      mapa.set(chave, registro);
    }
  }

  return {
    linhas: Array.from(mapa.values()),
    totalLidas,
    ignoradas,
    anos: Array.from(anos).sort(),
    ufs: Array.from(ufs).sort(),
  };
}

// Lê o arquivo escolhido: aceita .csv direto ou .zip do TSE.
export async function extrairTextoDoArquivo(file: File): Promise<string> {
  const buffer = new Uint8Array(await file.arrayBuffer());

  // Os arquivos do TSE vêm em ISO-8859-1
  const decodificar = (bytes: Uint8Array) =>
    new TextDecoder("iso-8859-1").decode(bytes);

  const ehZip =
    file.name.toLowerCase().endsWith(".zip") ||
    (buffer[0] === 0x50 && buffer[1] === 0x4b);

  if (!ehZip) return decodificar(buffer);

  const { unzipSync } = await import("fflate");
  const arquivos = unzipSync(buffer);

  // Dentro do zip pode haver vários CSVs (um por UF) e arquivos de apoio
  const nomes = Object.keys(arquivos).filter((n) =>
    n.toLowerCase().endsWith(".csv")
  );
  if (nomes.length === 0) {
    throw new Error("O zip não contém nenhum arquivo .csv.");
  }

  // Junta todos os CSVs, mantendo só o primeiro cabeçalho
  let resultado = "";
  nomes.forEach((nome, indice) => {
    const texto = decodificar(arquivos[nome]);
    if (indice === 0) {
      resultado = texto;
    } else {
      const semCabecalho = texto.split(/\r?\n/).slice(1).join("\n");
      resultado += "\n" + semCabecalho;
    }
  });

  return resultado;
}
