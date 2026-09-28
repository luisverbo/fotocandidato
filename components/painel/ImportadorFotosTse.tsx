"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ANO_ELEICAO } from "@/lib/cola/cargos";
import {
  abrirZipDeFotos,
  comprimirFoto,
  emLotes,
  sqDoNomeDoArquivo,
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

type Estado = "parado" | "lendo" | "enviando" | "pronto" | "erro";

export default function ImportadorFotosTse() {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [ano, setAno] = useState(String(ANO_ELEICAO));
  const [somenteSemFoto, setSomenteSemFoto] = useState(true);
  const [estado, setEstado] = useState<Estado>("parado");
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [progresso, setProgresso] = useState({ feito: 0, total: 0 });
  const [resumo, setResumo] = useState<string | null>(null);

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

  async function importar() {
    if (!arquivo) {
      setMensagem("Escolha o arquivo de fotos do TSE primeiro.");
      setEstado("erro");
      return;
    }

    setEstado("lendo");
    setResumo(null);
    setMensagem("Abrindo o arquivo de fotos…");

    try {
      const supabase = supabaseBrowser();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada. Entre de novo.");

      const imagens = await abrirZipDeFotos(arquivo);
      const porSq = new Map<string, Uint8Array>();
      for (const [nome, dados] of Object.entries(imagens)) {
        const sq = sqDoNomeDoArquivo(nome);
        if (sq) porSq.set(sq, dados);
      }

      if (porSq.size === 0) {
        throw new Error(
          "Nenhuma foto reconhecida no arquivo. Confira se é o foto_cand do TSE."
        );
      }

      setMensagem("Procurando os candidatos correspondentes…");
      const candidatos = await carregarCandidatos();

      const alvos = candidatos.filter(
        (c) =>
          c.sq_candidato &&
          porSq.has(c.sq_candidato) &&
          (!somenteSemFoto || !c.foto_url)
      );

      if (alvos.length === 0) {
        setEstado("erro");
        setMensagem(
          `Nenhum candidato para atualizar. O zip tem ${porSq.size} fotos, mas nenhuma bate com os candidatos importados (confira o ano e se o CSV já foi importado).`
        );
        return;
      }

      setEstado("enviando");
      setProgresso({ feito: 0, total: alvos.length });
      setMensagem("Enviando as fotos…");

      const atualizados: CandidatoAlvo[] = [];
      let falhas = 0;

      await emLotes(
        alvos,
        6,
        async (candidato) => {
          const bytes = porSq.get(candidato.sq_candidato!);
          if (!bytes) return;

          const comprimida = await comprimirFoto(bytes);
          if (!comprimida) {
            falhas++;
            return;
          }

          const caminho = `${user.id}/tse/${candidato.ano}/${candidato.sq_candidato}.jpg`;
          const { error } = await supabase.storage
            .from("logos")
            .upload(caminho, comprimida, {
              contentType: "image/jpeg",
              upsert: true,
            });
          if (error) {
            falhas++;
            return;
          }

          const url = supabase.storage.from("logos").getPublicUrl(caminho).data
            .publicUrl;
          atualizados.push({ ...candidato, foto_url: url });
        },
        (feitos) => setProgresso({ feito: feitos, total: alvos.length })
      );

      setMensagem("Salvando os endereços das fotos…");
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

      setEstado("pronto");
      setMensagem(null);
      setResumo(
        `${atualizados.length} fotos aplicadas${falhas > 0 ? ` · ${falhas} falharam` : ""} · ${porSq.size} fotos no arquivo`
      );
    } catch (erro) {
      setEstado("erro");
      setMensagem(erro instanceof Error ? erro.message : "Falha na importação.");
    }
  }

  const ocupado = estado === "lendo" || estado === "enviando";

  return (
    <section className="rounded-lg border border-zinc-800 p-5">
      <h2 className="text-lg font-bold text-white">
        Importar as fotos dos candidatos
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-zinc-400">
        Os arquivos de foto do TSE são nomeados com o código do candidato, o
        mesmo que veio no CSV — então cada foto vai parar no candidato certo
        sozinha. Importe o CSV primeiro.
      </p>

      <ol className="mt-4 max-w-2xl list-decimal space-y-2 pl-5 text-sm text-zinc-400">
        <li>
          Na mesma página de{" "}
          <a
            href="https://dadosabertos.tse.jus.br/dataset/candidatos-2026"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-zinc-200 underline"
          >
            Dados Abertos
          </a>
          , baixe o arquivo de fotos do estado:{" "}
          <code className="text-zinc-300">foto_cand{ano}_UF_div.zip</code>.
        </li>
        <li>
          Prefira o arquivo <strong>por estado</strong> — o do Brasil inteiro é
          muito pesado para abrir no navegador.
        </li>
        <li>Escolha o zip aqui embaixo e mande importar.</li>
      </ol>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input
          type="file"
          accept=".zip"
          disabled={ocupado}
          onChange={(e) => {
            setArquivo(e.target.files?.[0] ?? null);
            setEstado("parado");
            setMensagem(null);
            setResumo(null);
          }}
          className="text-sm text-zinc-400 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-zinc-900"
        />
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
        <button
          type="button"
          onClick={importar}
          disabled={ocupado || !arquivo}
          className="h-11 rounded-md bg-white px-5 font-semibold text-zinc-950 hover:bg-zinc-200 disabled:opacity-60"
        >
          {ocupado ? "Importando…" : "Importar fotos"}
        </button>
      </div>

      <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
        <input
          type="checkbox"
          checked={somenteSemFoto}
          onChange={(e) => setSomenteSemFoto(e.target.checked)}
          disabled={ocupado}
          className="h-4 w-4 accent-zinc-100"
        />
        Pular quem já tem foto (mais rápido ao repetir a importação)
      </label>

      {arquivo && (
        <p className="mt-2 text-xs text-zinc-500">
          {arquivo.name} · {(arquivo.size / 1024 / 1024).toFixed(1)} MB
        </p>
      )}

      {estado === "enviando" && progresso.total > 0 && (
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
            {progresso.feito} de {progresso.total} fotos
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
