"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import {
  extrairTextoDoArquivo,
  lerCsvTse,
  type LinhaImportada,
} from "@/lib/cola/importar-csv";

type Estado = "parado" | "lendo" | "gravando" | "pronto" | "erro";

export default function ImportadorCsvTse() {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [estado, setEstado] = useState<Estado>("parado");
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [progresso, setProgresso] = useState({ feito: 0, total: 0 });
  const [resumo, setResumo] = useState<string | null>(null);

  async function gravar(linhas: LinhaImportada[]) {
    const supabase = supabaseBrowser();
    const TAMANHO = 500;
    setProgresso({ feito: 0, total: linhas.length });

    for (let i = 0; i < linhas.length; i += TAMANHO) {
      const bloco = linhas.slice(i, i + TAMANHO);
      const { error } = await supabase
        .from("tse_candidatos")
        .upsert(bloco, { onConflict: "ano,uf,cargo,numero" });
      if (error) {
        throw new Error(`Erro ao gravar no banco: ${error.message}`);
      }
      setProgresso({ feito: Math.min(i + TAMANHO, linhas.length), total: linhas.length });
    }
  }

  async function importar() {
    if (!arquivo) {
      setMensagem("Escolha o arquivo do TSE primeiro.");
      setEstado("erro");
      return;
    }

    setEstado("lendo");
    setMensagem("Abrindo o arquivo…");
    setResumo(null);

    try {
      const texto = await extrairTextoDoArquivo(arquivo);
      setMensagem("Lendo os candidatos…");
      const resultado = lerCsvTse(texto);

      if (resultado.linhas.length === 0) {
        setEstado("erro");
        setMensagem(
          `Nenhum candidato aproveitado (${resultado.totalLidas} linhas lidas). Confira se o arquivo é o consulta_cand do ano certo.`
        );
        return;
      }

      setEstado("gravando");
      setMensagem("Gravando no banco…");
      await gravar(resultado.linhas);

      setEstado("pronto");
      setMensagem(null);
      setResumo(
        `${resultado.linhas.length} candidatos gravados · anos: ${resultado.anos.join(", ")} · estados: ${resultado.ufs.join(", ")}`
      );
    } catch (erro) {
      setEstado("erro");
      setMensagem(erro instanceof Error ? erro.message : "Falha na importação.");
    }
  }

  const ocupado = estado === "lendo" || estado === "gravando";

  return (
    <section className="rounded-lg border border-zinc-800 p-5">
      <h2 className="text-lg font-bold text-white">
        Importar pelo arquivo oficial do TSE
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-zinc-400">
        O TSE bloqueia consultas vindas de servidor, então a importação é feita
        pelo arquivo de Dados Abertos — que é a mesma fonte oficial, e não
        depende do TSE estar no ar quando o eleitor usar a cola.
      </p>

      <ol className="mt-4 max-w-2xl list-decimal space-y-2 pl-5 text-sm text-zinc-400">
        <li>
          Abra{" "}
          <a
            href="https://dadosabertos.tse.jus.br/dataset/candidatos-2026"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-zinc-200 underline"
          >
            dadosabertos.tse.jus.br/dataset/candidatos-2026
          </a>
          .
        </li>
        <li>
          Baixe <code className="text-zinc-300">consulta_cand_2026.zip</code>{" "}
          (Brasil inteiro) ou o arquivo do seu estado.
        </li>
        <li>Escolha o arquivo aqui embaixo — pode ser o .zip mesmo.</li>
      </ol>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input
          type="file"
          accept=".zip,.csv,.txt"
          disabled={ocupado}
          onChange={(e) => {
            setArquivo(e.target.files?.[0] ?? null);
            setEstado("parado");
            setMensagem(null);
            setResumo(null);
          }}
          className="text-sm text-zinc-400 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-zinc-900"
        />
        <button
          type="button"
          onClick={importar}
          disabled={ocupado || !arquivo}
          className="h-11 rounded-md bg-white px-5 font-semibold text-zinc-950 hover:bg-zinc-200 disabled:opacity-60"
        >
          {ocupado ? "Importando…" : "Importar arquivo"}
        </button>
      </div>

      {arquivo && (
        <p className="mt-2 text-xs text-zinc-500">
          {arquivo.name} · {(arquivo.size / 1024 / 1024).toFixed(1)} MB
        </p>
      )}

      {estado === "gravando" && progresso.total > 0 && (
        <div className="mt-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{
                width: `${Math.round((progresso.feito / progresso.total) * 100)}%`,
              }}
            />
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {progresso.feito} de {progresso.total} candidatos
          </p>
        </div>
      )}

      {mensagem && (
        <p
          role={estado === "erro" ? "alert" : "status"}
          className={`mt-4 text-sm font-semibold ${
            estado === "erro" ? "text-red-400" : "text-zinc-300"
          }`}
        >
          {mensagem}
        </p>
      )}

      {resumo && (
        <p role="status" className="mt-4 text-sm font-semibold text-emerald-400">
          {resumo}
        </p>
      )}
    </section>
  );
}
