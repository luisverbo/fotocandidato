"use client";

import { useState } from "react";
import { ANO_ELEICAO, UFS } from "@/lib/cola/cargos";

const CARGOS_IMPORTACAO = [
  { id: "presidente", nome: "Presidente (Brasil)" },
  { id: "governador", nome: "Governador" },
  { id: "senador", nome: "Senador" },
  { id: "deputado_federal", nome: "Deputado Federal" },
  { id: "deputado_estadual", nome: "Deputado Estadual" },
  { id: "deputado_distrital", nome: "Deputado Distrital (DF)" },
];

interface Linha {
  cargo: string;
  estado: "aguardando" | "importando" | "ok" | "erro";
  mensagem: string;
  tentativas?: { url: string; encontrados: number }[];
}

export default function ImportadorTse() {
  const [uf, setUf] = useState("BA");
  const [ano, setAno] = useState(String(ANO_ELEICAO));
  const [idsEleicao, setIdsEleicao] = useState("");
  const [rodando, setRodando] = useState(false);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [diagnostico, setDiagnostico] = useState<string | null>(null);
  const [diagnosticando, setDiagnosticando] = useState(false);

  const cargosDaVez = CARGOS_IMPORTACAO.filter((c) =>
    uf === "DF" ? c.id !== "deputado_estadual" : c.id !== "deputado_distrital"
  );

  const idsArray = idsEleicao
    .split(/[^0-9]+/)
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0);

  async function importar() {
    setRodando(true);
    setDiagnostico(null);
    setLinhas(
      cargosDaVez.map((c) => ({
        cargo: c.nome,
        estado: "aguardando",
        mensagem: "",
      }))
    );

    for (let i = 0; i < cargosDaVez.length; i++) {
      const cargo = cargosDaVez[i];
      setLinhas((atual) =>
        atual.map((l, idx) =>
          idx === i ? { ...l, estado: "importando", mensagem: "buscando…" } : l
        )
      );

      try {
        const resposta = await fetch("/api/tse/importar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ano: Number(ano),
            uf,
            cargo: cargo.id,
            idsEleicao: idsArray.length > 0 ? idsArray : undefined,
          }),
        });
        const dados = await resposta.json();

        setLinhas((atual) =>
          atual.map((l, idx) =>
            idx === i
              ? {
                  ...l,
                  estado: dados.ok ? "ok" : "erro",
                  mensagem: dados.ok
                    ? `${dados.gravados} candidatos`
                    : (dados.erro ?? "falhou"),
                  tentativas: dados.tentativas,
                }
              : l
          )
        );
      } catch {
        setLinhas((atual) =>
          atual.map((l, idx) =>
            idx === i ? { ...l, estado: "erro", mensagem: "erro de rede" } : l
          )
        );
      }
    }

    setRodando(false);
  }

  async function rodarDiagnostico() {
    setDiagnosticando(true);
    setDiagnostico(null);
    try {
      const params = new URLSearchParams({ ano, uf });
      if (idsArray.length > 0) params.set("idEleicao", String(idsArray[0]));
      const resposta = await fetch(`/api/tse/diagnostico?${params}`);
      const dados = await resposta.json();
      setDiagnostico(JSON.stringify(dados, null, 2));
    } catch {
      setDiagnostico("Falha ao rodar o diagnóstico.");
    } finally {
      setDiagnosticando(false);
    }
  }

  return (
    <div>
      <div className="mt-6 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-zinc-400">
            Estado
          </span>
          <select
            value={uf}
            onChange={(e) => setUf(e.target.value)}
            disabled={rodando}
            className="h-11 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-zinc-100"
          >
            {UFS.map((u) => (
              <option key={u.sigla} value={u.sigla}>
                {u.nome} ({u.sigla})
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-zinc-400">
            Ano
          </span>
          <input
            value={ano}
            onChange={(e) => setAno(e.target.value.replace(/\D/g, ""))}
            disabled={rodando}
            className="h-11 w-24 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-zinc-100"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-zinc-400">
            ID da eleição (opcional)
          </span>
          <input
            value={idsEleicao}
            onChange={(e) => setIdsEleicao(e.target.value)}
            disabled={rodando}
            placeholder="ex: 544, 546"
            className="h-11 w-44 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-zinc-100 placeholder:text-zinc-600"
          />
        </label>

        <button
          type="button"
          onClick={importar}
          disabled={rodando}
          className="h-11 rounded-md bg-white px-5 font-semibold text-zinc-950 hover:bg-zinc-200 disabled:opacity-60"
        >
          {rodando ? "Importando…" : `Importar ${uf}`}
        </button>

        <button
          type="button"
          onClick={rodarDiagnostico}
          disabled={diagnosticando || rodando}
          className="h-11 rounded-md border border-zinc-700 px-5 font-semibold text-zinc-300 hover:bg-zinc-800 disabled:opacity-60"
        >
          {diagnosticando ? "Testando…" : "Diagnóstico"}
        </button>
      </div>

      {linhas.length > 0 && (
        <ul className="mt-6 space-y-2">
          {linhas.map((l) => (
            <li
              key={l.cargo}
              className="rounded-md border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-zinc-200">{l.cargo}</span>
                <span
                  className={
                    l.estado === "ok"
                      ? "text-emerald-400"
                      : l.estado === "erro"
                        ? "text-red-400"
                        : "text-zinc-500"
                  }
                >
                  {l.estado === "importando"
                    ? "importando…"
                    : l.mensagem || "aguardando"}
                </span>
              </div>
              {l.tentativas && l.tentativas.length > 0 && (
                <ul className="mt-2 space-y-1 border-t border-zinc-800 pt-2">
                  {l.tentativas.map((t) => (
                    <li key={t.url} className="break-all text-xs text-zinc-500">
                      {t.encontrados >= 0 ? `${t.encontrados} →` : "sem id →"}{" "}
                      {t.url}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      {diagnostico && (
        <div className="mt-6">
          <p className="mb-2 text-sm font-semibold text-zinc-400">
            Diagnóstico (copie e envie para ajustar a integração)
          </p>
          <pre className="max-h-96 overflow-auto rounded-md border border-zinc-800 bg-zinc-900 p-4 text-xs text-zinc-300">
            {diagnostico}
          </pre>
        </div>
      )}
    </div>
  );
}
