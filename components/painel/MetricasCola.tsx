"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { UFS } from "@/lib/cola/cargos";

interface Resumo {
  acessos: number;
  estados_escolhidos: number;
  colas_geradas: number;
  pdfs: number;
  imagens: number;
  compartilhamentos: number;
}

interface LinhaEstado {
  uf: string;
  acessos: number;
  colas: number;
}

interface LinhaNumero {
  numero: string;
  nome_urna: string | null;
  partido: string | null;
  total: number;
}

const CARGOS_METRICA = [
  { id: "presidente", nome: "Presidente" },
  { id: "governador", nome: "Governador" },
  { id: "senador", nome: "Senador" },
  { id: "deputado_federal", nome: "Dep. Federal" },
  { id: "deputado_estadual", nome: "Dep. Estadual" },
  { id: "deputado_distrital", nome: "Dep. Distrital" },
];

function formatar(n: number): string {
  return n.toLocaleString("pt-BR");
}

// Indicador: o número é o dado, o rótulo fica em tinta secundária.
function Indicador({
  rotulo,
  valor,
  detalhe,
}: {
  rotulo: string;
  valor: number;
  detalhe?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-sm text-zinc-400">{rotulo}</p>
      <p className="font-display text-4xl font-extrabold text-white">
        {formatar(valor)}
      </p>
      {detalhe && <p className="mt-0.5 text-xs text-zinc-500">{detalhe}</p>}
    </div>
  );
}

// Barra de magnitude: uma cor só, valor rotulado na ponta.
function Barra({
  titulo,
  subtitulo,
  valor,
  maximo,
  auxiliar,
}: {
  titulo: string;
  subtitulo?: string | null;
  valor: number;
  maximo: number;
  auxiliar?: string;
}) {
  const largura = maximo > 0 ? Math.max((valor / maximo) * 100, 1.5) : 0;
  return (
    <li
      className="group grid grid-cols-[9rem_1fr_auto] items-center gap-3 py-1.5"
      title={`${titulo}: ${formatar(valor)}`}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-zinc-200">{titulo}</p>
        {subtitulo && (
          <p className="truncate text-xs text-zinc-500">{subtitulo}</p>
        )}
      </div>
      <div className="h-5 w-full rounded bg-zinc-800/60">
        <div
          className="h-5 rounded bg-blue-500 transition-[width] group-hover:bg-blue-400"
          style={{ width: `${largura}%` }}
        />
      </div>
      <div className="text-right">
        <span className="font-display text-lg font-extrabold text-white">
          {formatar(valor)}
        </span>
        {auxiliar && (
          <span className="ml-2 text-xs text-zinc-500">{auxiliar}</span>
        )}
      </div>
    </li>
  );
}

export default function MetricasCola() {
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [estados, setEstados] = useState<LinhaEstado[]>([]);
  const [numeros, setNumeros] = useState<LinhaNumero[]>([]);
  const [cargo, setCargo] = useState("presidente");
  const [ufFiltro, setUfFiltro] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Resumo e estados: carregam uma vez
  useEffect(() => {
    const supabase = supabaseBrowser();
    Promise.all([
      supabase.rpc("cola_metricas_resumo"),
      supabase.rpc("cola_metricas_por_estado"),
    ])
      .then(([r, e]) => {
        if (r.error || e.error) {
          setErro(
            "Não foi possível ler as métricas. Rode a migração 008 no Supabase."
          );
          return;
        }
        const linhaResumo = Array.isArray(r.data) ? r.data[0] : r.data;
        setResumo((linhaResumo as Resumo) ?? null);
        setEstados((e.data ?? []) as LinhaEstado[]);
      })
      .finally(() => setCarregando(false));
  }, []);

  // Ranking de números: recarrega ao trocar cargo ou estado
  useEffect(() => {
    supabaseBrowser()
      .rpc("cola_metricas_numeros", {
        p_cargo: cargo,
        p_uf: ufFiltro || null,
        p_limite: 20,
      })
      .then(({ data, error }) => {
        if (error) return;
        setNumeros((data ?? []) as LinhaNumero[]);
      });
  }, [cargo, ufFiltro]);

  const maxEstado = useMemo(
    () => Math.max(0, ...estados.map((e) => e.colas)),
    [estados]
  );
  const maxNumero = useMemo(
    () => Math.max(0, ...numeros.map((n) => n.total)),
    [numeros]
  );

  const taxa =
    resumo && resumo.acessos > 0
      ? Math.round((resumo.colas_geradas / resumo.acessos) * 100)
      : 0;

  if (carregando) {
    return <p className="text-sm text-zinc-400">Carregando métricas…</p>;
  }

  if (erro) {
    return (
      <p role="alert" className="text-sm font-semibold text-red-400">
        {erro}
      </p>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-white">Métricas da Cola Digital</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Contagens anônimas: não guardamos IP, nome nem qualquer dado que
          identifique quem usou a cola.
        </p>
      </div>

      {/* Indicadores */}
      <section aria-label="Resumo" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador
          rotulo="Acessos"
          valor={resumo?.acessos ?? 0}
          detalhe="visitas à página"
        />
        <Indicador
          rotulo="Colas geradas"
          valor={resumo?.colas_geradas ?? 0}
          detalhe={`${taxa}% de quem acessou`}
        />
        <Indicador rotulo="PDFs baixados" valor={resumo?.pdfs ?? 0} />
        <Indicador
          rotulo="Imagens e compartilhamentos"
          valor={(resumo?.imagens ?? 0) + (resumo?.compartilhamentos ?? 0)}
          detalhe={`${formatar(resumo?.imagens ?? 0)} imagens · ${formatar(resumo?.compartilhamentos ?? 0)} compartilhadas`}
        />
      </section>

      {/* Por estado */}
      <section aria-labelledby="titulo-estados">
        <h2 id="titulo-estados" className="text-lg font-bold text-white">
          Colas geradas por estado
        </h2>
        {estados.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">
            Nenhuma cola gerada ainda.
          </p>
        ) : (
          <ul className="mt-3">
            {estados.map((e) => (
              <Barra
                key={e.uf}
                titulo={UFS.find((u) => u.sigla === e.uf)?.nome ?? e.uf}
                subtitulo={e.uf}
                valor={e.colas}
                maximo={maxEstado}
                auxiliar={`${formatar(e.acessos)} acessos`}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Números mais escolhidos */}
      <section aria-labelledby="titulo-numeros">
        <h2 id="titulo-numeros" className="text-lg font-bold text-white">
          Números mais escolhidos
        </h2>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {CARGOS_METRICA.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCargo(c.id)}
              aria-pressed={cargo === c.id}
              className={`rounded-md px-3 py-2 text-sm font-semibold ${
                cargo === c.id
                  ? "bg-zinc-100 text-zinc-900"
                  : "border border-zinc-700 text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              {c.nome}
            </button>
          ))}

          <select
            value={ufFiltro}
            onChange={(e) => setUfFiltro(e.target.value)}
            aria-label="Filtrar por estado"
            className="ml-auto h-10 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100"
          >
            <option value="">Todos os estados</option>
            {UFS.map((u) => (
              <option key={u.sigla} value={u.sigla}>
                {u.nome}
              </option>
            ))}
          </select>
        </div>

        {numeros.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">
            Nenhuma escolha registrada para este cargo ainda.
          </p>
        ) : (
          <ul className="mt-4">
            {numeros.map((n) => (
              <Barra
                key={n.numero}
                titulo={`${n.numero} · ${n.nome_urna ?? "—"}`}
                subtitulo={n.partido}
                valor={n.total}
                maximo={maxNumero}
              />
            ))}
          </ul>
        )}

        <p className="mt-4 text-xs text-zinc-500">
          Conta quantas colas foram geradas com cada número. Uma pessoa que
          baixa PDF e imagem aparece duas vezes.
        </p>
      </section>
    </div>
  );
}
