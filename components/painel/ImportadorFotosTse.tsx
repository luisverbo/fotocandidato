"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ANO_ELEICAO, UFS } from "@/lib/cola/cargos";
import {
  abrirZipDeFotos,
  comprimirFoto,
  emLotes,
  sqDoNomeDoArquivo,
  urlFotosTse,
} from "@/lib/cola/importar-fotos";

interface CandidatoAlvo {
  id: string;
  ano: number;
  uf: string;
  cargo: string;
  numero: string;
  nome_urna: string;
  sq_candidato: string | null;
  foto_url: string | null;
}

type Estado = "parado" | "trabalhando" | "pronto" | "erro";

export default function ImportadorFotosTse() {
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [ano, setAno] = useState(String(ANO_ELEICAO));
  const [ufsEscolhidas, setUfsEscolhidas] = useState<string[]>([]);
  const [somenteSemFoto, setSomenteSemFoto] = useState(true);
  const [estado, setEstado] = useState<Estado>("parado");
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [progresso, setProgresso] = useState({ feito: 0, total: 0 });
  const [registro, setRegistro] = useState<string[]>([]);

  function anotar(linha: string) {
    setRegistro((atual) => [...atual, linha]);
  }

  // Busca todos os candidatos do ano, em páginas (o Supabase limita a 1000)
  async function carregarCandidatos(): Promise<CandidatoAlvo[]> {
    const supabase = supabaseBrowser();
    const todos: CandidatoAlvo[] = [];
    const PAGINA = 1000;

    for (let inicio = 0; ; inicio += PAGINA) {
      const { data, error } = await supabase
        .from("tse_candidatos")
        .select("id, ano, uf, cargo, numero, nome_urna, sq_candidato, foto_url")
        .eq("ano", Number(ano))
        .not("sq_candidato", "is", null)
        .range(inicio, inicio + PAGINA - 1);

      if (error) throw new Error(`Erro ao ler o banco: ${error.message}`);
      const pagina = (data ?? []) as CandidatoAlvo[];
      todos.push(...pagina);
      if (pagina.length < PAGINA) break;
    }
    return todos;
  }

  // Aplica um zip de fotos sobre os candidatos já importados.
  async function processarZip(
    rotulo: string,
    origem: File | Uint8Array,
    candidatos: CandidatoAlvo[],
    userId: string
  ): Promise<number> {
    const imagens = await abrirZipDeFotos(origem);
    const porSq = new Map<string, Uint8Array>();
    for (const [nome, dados] of Object.entries(imagens)) {
      const sq = sqDoNomeDoArquivo(nome);
      if (sq) porSq.set(sq, dados);
    }

    if (porSq.size === 0) {
      anotar(`${rotulo}: nenhuma foto reconhecida no arquivo`);
      return 0;
    }

    const alvos = candidatos.filter(
      (c) =>
        c.sq_candidato &&
        porSq.has(c.sq_candidato) &&
        (!somenteSemFoto || !c.foto_url)
    );

    if (alvos.length === 0) {
      anotar(`${rotulo}: ${porSq.size} fotos, nenhum candidato para atualizar`);
      return 0;
    }

    const supabase = supabaseBrowser();
    const atualizados: CandidatoAlvo[] = [];
    setProgresso({ feito: 0, total: alvos.length });

    await emLotes(
      alvos,
      6,
      async (candidato) => {
        const bytes = porSq.get(candidato.sq_candidato!);
        if (!bytes) return;
        const comprimida = await comprimirFoto(bytes);
        if (!comprimida) return;

        const caminho = `${userId}/tse/${candidato.ano}/${candidato.sq_candidato}.jpg`;
        const { error } = await supabase.storage
          .from("logos")
          .upload(caminho, comprimida, {
            contentType: "image/jpeg",
            upsert: true,
          });
        if (error) return;

        const url = supabase.storage.from("logos").getPublicUrl(caminho).data
          .publicUrl;
        atualizados.push({ ...candidato, foto_url: url });
      },
      (feitos) => setProgresso({ feito: feitos, total: alvos.length })
    );

    for (let i = 0; i < atualizados.length; i += 500) {
      const bloco = atualizados.slice(i, i + 500).map((c) => ({
        id: c.id,
        ano: c.ano,
        uf: c.uf,
        cargo: c.cargo,
        numero: c.numero,
        nome_urna: c.nome_urna,
        foto_url: c.foto_url,
      }));
      const { error } = await supabase.from("tse_candidatos").upsert(bloco);
      if (error) throw new Error(`Erro ao salvar: ${error.message}`);
    }

    // Marca em memória para o próximo zip não repetir o trabalho
    for (const c of atualizados) {
      const alvo = candidatos.find((x) => x.id === c.id);
      if (alvo) alvo.foto_url = c.foto_url;
    }

    anotar(`${rotulo}: ${atualizados.length} fotos aplicadas`);
    return atualizados.length;
  }

  async function executar(
    tarefas: { rotulo: string; obter: () => Promise<File | Uint8Array> }[]
  ) {
    if (tarefas.length === 0) {
      setEstado("erro");
      setMensagem("Escolha os arquivos ou marque os estados primeiro.");
      return;
    }

    setEstado("trabalhando");
    setRegistro([]);
    setMensagem("Lendo os candidatos do banco…");

    try {
      const supabase = supabaseBrowser();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada. Entre de novo.");

      const candidatos = await carregarCandidatos();
      if (candidatos.length === 0) {
        throw new Error(
          "Nenhum candidato no banco para este ano. Importe o CSV primeiro."
        );
      }

      let total = 0;
      for (const tarefa of tarefas) {
        setMensagem(`Processando ${tarefa.rotulo}…`);
        try {
          const origem = await tarefa.obter();
          total += await processarZip(tarefa.rotulo, origem, candidatos, user.id);
        } catch (erro) {
          anotar(
            `${tarefa.rotulo}: ${erro instanceof Error ? erro.message : "falhou"}`
          );
        }
      }

      setEstado("pronto");
      setMensagem(`Concluído — ${total} fotos aplicadas no total.`);
    } catch (erro) {
      setEstado("erro");
      setMensagem(erro instanceof Error ? erro.message : "Falha na importação.");
    }
  }

  function importarArquivos() {
    void executar(
      arquivos.map((f) => ({
        rotulo: f.name,
        obter: async () => f,
      }))
    );
  }

  function baixarDoTse() {
    void executar(
      ufsEscolhidas.map((uf) => ({
        rotulo: `${uf} (baixando do TSE)`,
        obter: async () => {
          const resposta = await fetch(urlFotosTse(ano, uf));
          if (!resposta.ok) {
            throw new Error(`o TSE respondeu ${resposta.status}`);
          }
          return new Uint8Array(await resposta.arrayBuffer());
        },
      }))
    );
  }

  const ocupado = estado === "trabalhando";

  return (
    <section className="rounded-lg border border-zinc-800 p-5">
      <h2 className="text-lg font-bold text-white">
        Importar as fotos dos candidatos
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-zinc-400">
        Os arquivos de foto do TSE são nomeados com o código do candidato — o
        mesmo que veio no CSV —, então cada foto vai para o candidato certo
        sozinha. Importe o CSV antes.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3 border-b border-zinc-800 pb-5">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-zinc-500">
            Ano
          </span>
          <input
            value={ano}
            onChange={(e) => setAno(e.target.value.replace(/\D/g, ""))}
            disabled={ocupado}
            className="h-10 w-24 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-zinc-100"
          />
        </label>
        <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={somenteSemFoto}
            onChange={(e) => setSomenteSemFoto(e.target.checked)}
            disabled={ocupado}
            className="h-4 w-4 accent-zinc-100"
          />
          Pular quem já tem foto
        </label>
      </div>

      {/* Opção 1 — baixar direto do TSE pelo navegador */}
      <div className="mt-5">
        <h3 className="text-sm font-bold text-zinc-200">
          1. Baixar direto do TSE
        </h3>
        <p className="mt-1 max-w-2xl text-xs text-zinc-500">
          Tenta baixar pelo seu navegador (o TSE não bloqueia IP residencial).
          Se o TSE recusar por política de origem, use a opção 2.
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {UFS.map((u) => {
            const marcada = ufsEscolhidas.includes(u.sigla);
            return (
              <button
                key={u.sigla}
                type="button"
                disabled={ocupado}
                onClick={() =>
                  setUfsEscolhidas((atual) =>
                    marcada
                      ? atual.filter((x) => x !== u.sigla)
                      : [...atual, u.sigla]
                  )
                }
                className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${
                  marcada
                    ? "bg-zinc-100 text-zinc-900"
                    : "border border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                }`}
              >
                {u.sigla}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={ocupado}
            onClick={() => setUfsEscolhidas(UFS.map((u) => u.sigla))}
            className="text-xs font-semibold text-zinc-400 underline"
          >
            Marcar todos
          </button>
          <button
            type="button"
            disabled={ocupado}
            onClick={() => setUfsEscolhidas([])}
            className="text-xs font-semibold text-zinc-400 underline"
          >
            Limpar
          </button>
          <button
            type="button"
            onClick={baixarDoTse}
            disabled={ocupado || ufsEscolhidas.length === 0}
            className="h-10 rounded-md bg-white px-4 text-sm font-semibold text-zinc-950 hover:bg-zinc-200 disabled:opacity-60"
          >
            Baixar e importar ({ufsEscolhidas.length})
          </button>
        </div>
      </div>

      {/* Opção 2 — arquivos baixados à mão */}
      <div className="mt-6 border-t border-zinc-800 pt-5">
        <h3 className="text-sm font-bold text-zinc-200">
          2. Enviar os arquivos que você baixou
        </h3>
        <p className="mt-1 max-w-2xl text-xs text-zinc-500">
          Baixe os <code className="text-zinc-400">foto_cand{ano}_UF_div.zip</code>{" "}
          em{" "}
          <a
            href="https://dadosabertos.tse.jus.br/dataset/candidatos-2026"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-zinc-300 underline"
          >
            Dados Abertos
          </a>{" "}
          e selecione vários de uma vez.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept=".zip"
            multiple
            disabled={ocupado}
            onChange={(e) => {
              setArquivos(Array.from(e.target.files ?? []));
              setEstado("parado");
              setMensagem(null);
            }}
            className="text-sm text-zinc-400 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-zinc-900"
          />
          <button
            type="button"
            onClick={importarArquivos}
            disabled={ocupado || arquivos.length === 0}
            className="h-10 rounded-md bg-white px-4 text-sm font-semibold text-zinc-950 hover:bg-zinc-200 disabled:opacity-60"
          >
            Importar ({arquivos.length})
          </button>
        </div>
      </div>

      {ocupado && progresso.total > 0 && (
        <div className="mt-5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{
                width: `${Math.round((progresso.feito / progresso.total) * 100)}%`,
              }}
            />
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {progresso.feito} de {progresso.total} fotos
          </p>
        </div>
      )}

      {mensagem && (
        <p
          role={estado === "erro" ? "alert" : "status"}
          className={`mt-4 text-sm font-semibold ${
            estado === "erro"
              ? "text-red-400"
              : estado === "pronto"
                ? "text-emerald-400"
                : "text-zinc-300"
          }`}
        >
          {mensagem}
        </p>
      )}

      {registro.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-zinc-500">
          {registro.map((linha, i) => (
            <li key={i}>{linha}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
