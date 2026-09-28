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
}

export default function ImportadorTse() {
  const [uf, setUf] = useState("BA");
  const [rodando, setRodando] = useState(false);
  const [linhas, setLinhas] = useState<Linha[]>([]);

  const cargosDaVez = CARGOS_IMPORTACAO.filter((c) =>
    uf === "DF"
      ? c.id !== "deputado_estadual"
      : c.id !== "deputado_distrital"
  );

  async function importar() {
    setRodando(true);
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
          body: JSON.stringify({ ano: ANO_ELEICAO, uf, cargo: cargo.id }),
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
                }
              : l
          )
        );
      } catch {
        setLinhas((atual) =>
          atual.map((l, idx) =>
            idx === i
              ? { ...l, estado: "erro", mensagem: "erro de rede" }
              : l
          )
        );
      }
    }

    setRodando(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Cola Digital — dados do TSE</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-400">
        Baixa a lista oficial de candidatos do TSE e grava no nosso banco. A
        página pública <code className="text-zinc-300">/cola</code> consulta
        daqui, sem depender do TSE na hora. Rode uma vez por estado — e de novo
        quando quiser atualizar.
      </p>

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
        <button
          type="button"
          onClick={importar}
          disabled={rodando}
          className="h-11 rounded-md bg-white px-5 font-semibold text-zinc-950 hover:bg-zinc-200 disabled:opacity-60"
        >
          {rodando ? "Importando…" : `Importar ${uf}`}
        </button>
      </div>

      {linhas.length > 0 && (
        <ul className="mt-6 space-y-2">
          {linhas.map((l) => (
            <li
              key={l.cargo}
              className="flex items-center justify-between gap-3 rounded-md border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm"
            >
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
