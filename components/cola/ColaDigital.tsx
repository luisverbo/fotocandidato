"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { aguardarFontes } from "@/lib/canvas/fontes";
import {
  ANO_ELEICAO,
  cargosDaUf,
  UFS,
  type DefinicaoCargo,
} from "@/lib/cola/cargos";
import { buscarCandidatos, contarCandidatos, type CandidatoCola } from "@/lib/cola/busca";
import { COLA_H, COLA_W, desenharCola, type LinhaCola } from "@/lib/cola/render";
import {
  definirSomDesligado,
  somDesligado,
  tocarConfirma,
  tocarObturador,
  tocarTecla,
} from "@/lib/cola/sons";

interface Vaga {
  id: string;
  cargo: DefinicaoCargo;
  rotulo: string;
}

interface Preenchimento {
  numero: string;
  candidato: CandidatoCola | null;
  sugestoes: CandidatoCola[];
  buscando: boolean;
}

const VAZIO: Preenchimento = {
  numero: "",
  candidato: null,
  sugestoes: [],
  buscando: false,
};

// Fotos que ficam no nosso Storage já vêm com CORS e podem ir direto para
// o canvas. Só as que continuam no TSE precisam passar pelo proxy.
function urlFoto(url: string | null): string | null {
  if (!url) return null;
  try {
    const host = new URL(url, window.location.origin).hostname;
    if (host.endsWith("tse.jus.br")) {
      return `/api/tse/foto?url=${encodeURIComponent(url)}`;
    }
  } catch {
    return url;
  }
  return url;
}

export default function ColaDigital() {
  const [uf, setUf] = useState("");
  const [temDados, setTemDados] = useState<boolean | null>(null);
  const [preenchimentos, setPreenchimentos] = useState<
    Record<string, Preenchimento>
  >({});
  const [fotos, setFotos] = useState<Record<string, HTMLImageElement | null>>({});
  const [gerando, setGerando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [semSom, setSemSom] = useState(false);
  // Imagem pronta, exibida num cartão para a pessoa salvar
  const [imagemPronta, setImagemPronta] = useState<{
    url: string;
    arquivo: File;
  } | null>(null);

  // O estado do som fica no aparelho da pessoa
  useEffect(() => {
    setSemSom(somDesligado());
  }, []);

  // Métrica de acesso: uma vez por visita, sem nada que identifique a pessoa
  useEffect(() => {
    try {
      if (sessionStorage.getItem("cola-visita-registrada")) return;
      sessionStorage.setItem("cola-visita-registrada", "1");
    } catch {
      // sem sessionStorage seguimos e o acesso é contado igual
    }
    void supabaseBrowser()
      .from("cola_visitas")
      .insert({ etapa: "abriu" })
      .then(
        () => {},
        () => {}
      );
  }, []);

  // Métrica do estado escolhido, uma vez por estado por visita
  useEffect(() => {
    if (!uf) return;
    try {
      const chave = `cola-estado-${uf}`;
      if (sessionStorage.getItem(chave)) return;
      sessionStorage.setItem(chave, "1");
    } catch {
      // segue sem o controle de repetição
    }
    void supabaseBrowser()
      .from("cola_visitas")
      .insert({ etapa: "escolheu_estado", uf })
      .then(
        () => {},
        () => {}
      );
  }, [uf]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const urlsCarregadas = useRef<Record<string, string>>({});

  const vagas: Vaga[] = useMemo(() => {
    if (!uf) return [];
    return cargosDaUf(uf).flatMap((cargo) =>
      Array.from({ length: cargo.vagas }, (_, i) => ({
        id: cargo.vagas > 1 ? `${cargo.id}-${i + 1}` : cargo.id,
        cargo,
        rotulo: cargo.vagas > 1 ? `${cargo.nome} ${i + 1}º voto` : cargo.nome,
      }))
    );
  }, [uf]);

  // Avisa quando o estado escolhido ainda não tem candidatos importados
  useEffect(() => {
    if (!uf) {
      setTemDados(null);
      return;
    }
    let ativo = true;
    contarCandidatos(uf).then((qtd) => {
      if (ativo) setTemDados(qtd > 0);
    });
    return () => {
      ativo = false;
    };
  }, [uf]);

  // Carrega as fotos dos candidatos escolhidos para usar no canvas
  useEffect(() => {
    for (const [vagaId, p] of Object.entries(preenchimentos)) {
      const url = urlFoto(p.candidato?.foto_url ?? null);

      if (!url) {
        if (urlsCarregadas.current[vagaId]) {
          delete urlsCarregadas.current[vagaId];
          setFotos((f) => ({ ...f, [vagaId]: null }));
        }
        continue;
      }

      if (urlsCarregadas.current[vagaId] === url) continue;
      urlsCarregadas.current[vagaId] = url;

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => setFotos((f) => ({ ...f, [vagaId]: img }));
      img.onerror = () => {
        // Sem CORS a foto não serve para o canvas: segue com a inicial
        setFotos((f) => ({ ...f, [vagaId]: null }));
      };
      img.src = url;
    }
  }, [preenchimentos]);

  const linhas: LinhaCola[] = useMemo(
    () =>
      vagas
        .map((vaga) => {
          const p = preenchimentos[vaga.id] ?? VAZIO;
          return {
            cargo: vaga.cargo,
            rotulo: vaga.rotulo,
            candidato: p.candidato,
            numeroDigitado: p.numero,
            foto: fotos[vaga.id] ?? null,
          };
        })
        .filter((l) => l.candidato || l.numeroDigitado),
    [vagas, preenchimentos, fotos]
  );

  // Redesenha a prévia sempre que algo muda
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || linhas.length === 0) return;
    aguardarFontes().then(() => desenharCola(canvas, uf, linhas));
  }, [linhas, uf]);

  const aoDigitar = useCallback(
    (vaga: Vaga, valor: string) => {
      const numero = valor.replace(/\D/g, "").slice(0, vaga.cargo.digitos);
      const anterior = preenchimentos[vaga.id]?.numero ?? "";
      // Só na digitação, não ao apagar
      if (numero.length > anterior.length) tocarTecla();

      setPreenchimentos((atual) => ({
        ...atual,
        [vaga.id]: {
          ...(atual[vaga.id] ?? VAZIO),
          numero,
          candidato: null,
          buscando: numero.length >= 2,
        },
      }));

      clearTimeout(timers.current[vaga.id]);
      if (numero.length < 2) {
        setPreenchimentos((atual) => ({
          ...atual,
          [vaga.id]: { ...(atual[vaga.id] ?? VAZIO), numero, sugestoes: [] },
        }));
        return;
      }

      timers.current[vaga.id] = setTimeout(async () => {
        const achados = await buscarCandidatos(uf, vaga.cargo.id, numero);
        setPreenchimentos((atual) => {
          const p = atual[vaga.id] ?? VAZIO;
          if (p.numero !== numero) return atual;
          // Número completo com um único resultado: já seleciona
          const exato =
            numero.length === vaga.cargo.digitos
              ? (achados.find((c) => c.numero === numero) ?? null)
              : null;
          if (exato) tocarConfirma();
          return {
            ...atual,
            [vaga.id]: {
              ...p,
              buscando: false,
              sugestoes: exato ? [] : achados,
              candidato: exato ?? null,
            },
          };
        });
      }, 300);
    },
    [uf, preenchimentos]
  );

  function escolher(vaga: Vaga, candidato: CandidatoCola) {
    tocarConfirma();
    setPreenchimentos((atual) => ({
      ...atual,
      [vaga.id]: {
        numero: candidato.numero,
        candidato,
        sugestoes: [],
        buscando: false,
      },
    }));
  }

  function limpar(vaga: Vaga) {
    setPreenchimentos((atual) => ({ ...atual, [vaga.id]: { ...VAZIO } }));
    setFotos((f) => ({ ...f, [vaga.id]: null }));
  }

  function registrar(acao: "pdf" | "imagem" | "share") {
    try {
      const supabase = supabaseBrowser();

      void supabase
        .from("colas_geradas")
        .insert({ uf, acao, qtd_cargos: linhas.length })
        .then(
          () => {},
          () => {}
        );

      // Um registro por número escolhido, para saber o que mais aparece
      const escolhas = linhas
        .filter((l) => l.candidato)
        .map((l) => ({
          uf,
          cargo: l.cargo.id,
          numero: l.candidato!.numero,
          nome_urna: l.candidato!.nome_urna,
          partido: l.candidato!.partido,
          acao,
        }));

      if (escolhas.length > 0) {
        void supabase
          .from("cola_escolhas")
          .insert(escolhas)
          .then(
            () => {},
            () => {}
          );
      }
    } catch {
      // métrica nunca atrapalha
    }
  }

  async function prepararCanvas(): Promise<HTMLCanvasElement | null> {
    if (linhas.length === 0) return null;
    await aguardarFontes();
    const canvas = document.createElement("canvas");
    desenharCola(canvas, uf, linhas);
    return canvas;
  }

  async function baixarPdf() {
    if (gerando) return;
    setGerando(true);
    setAviso(null);
    try {
      const canvas = await prepararCanvas();
      if (!canvas) return;
      tocarObturador();
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      pdf.addImage(
        canvas.toDataURL("image/jpeg", 0.92),
        "JPEG",
        0,
        0,
        210,
        297
      );
      pdf.save(`cola-de-votacao-${uf}.pdf`);
      registrar("pdf");
      setAviso("PDF salvo! Agora é só imprimir e levar no papel.");
    } catch {
      setAviso("Não conseguimos gerar o PDF. Tente baixar como imagem.");
    } finally {
      setGerando(false);
    }
  }

  // Gera a imagem como arquivo de verdade. Endereço de dados (data URL)
  // não funciona aqui: a cola em A4 fica grande demais e o navegador
  // abre o diálogo mas não salva.
  async function gerarArquivoImagem(): Promise<File | null> {
    const canvas = await prepararCanvas();
    if (!canvas) return null;
    const blob = await new Promise<Blob | null>((r) =>
      canvas.toBlob(r, "image/jpeg", 0.92)
    );
    if (!blob) return null;
    return new File([blob], `cola-de-votacao-${uf}.jpg`, {
      type: "image/jpeg",
    });
  }

  function mostrarImagem(arquivo: File) {
    setImagemPronta((anterior) => {
      if (anterior) URL.revokeObjectURL(anterior.url);
      return { url: URL.createObjectURL(arquivo), arquivo };
    });
  }

  function fecharImagem() {
    setImagemPronta((anterior) => {
      if (anterior) URL.revokeObjectURL(anterior.url);
      return null;
    });
  }

  async function salvarNaGaleria() {
    if (!imagemPronta) return;
    try {
      await navigator.share({
        files: [imagemPronta.arquivo],
        title: "Minha cola de votação",
      });
      registrar("share");
    } catch {
      // a pessoa cancelou — o botão de baixar continua ali
    }
  }

  async function baixarImagem() {
    if (gerando) return;
    setGerando(true);
    setAviso(null);
    try {
      const arquivo = await gerarArquivoImagem();
      if (!arquivo) return;
      tocarObturador();
      mostrarImagem(arquivo);
      registrar("imagem");
    } catch {
      setAviso("Não conseguimos gerar a imagem. Tente de novo.");
    } finally {
      setGerando(false);
    }
  }

  async function compartilhar() {
    if (gerando) return;
    setGerando(true);
    setAviso(null);
    try {
      const arquivo = await gerarArquivoImagem();
      if (!arquivo) return;
      tocarObturador();

      let compartilhou = false;
      if (
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [arquivo] })
      ) {
        try {
          await navigator.share({
            files: [arquivo],
            title: "Minha cola de votação",
          });
          compartilhou = true;
          registrar("share");
        } catch {
          compartilhou = true; // cancelou; não force o download
        }
      }

      if (!compartilhou) {
        mostrarImagem(arquivo);
        registrar("imagem");
      }
    } catch {
      // usuário cancelou
    } finally {
      setGerando(false);
    }
  }

  const alvoToque = "min-h-14";

  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl bg-white pb-20">
      <header className="bg-slate-900 px-6 pb-8 pt-6 text-white">
        <div className="flex items-start justify-between gap-4">
          <Link
            href="/"
            className="text-sm font-semibold text-slate-400 hover:text-slate-200"
          >
            Santinho Digital
          </Link>
          <button
            type="button"
            onClick={() => {
              const novo = !semSom;
              setSemSom(novo);
              definirSomDesligado(novo);
              if (!novo) tocarTecla();
            }}
            aria-pressed={semSom}
            className="rounded-full border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800"
          >
            {semSom ? "Som desligado" : "Som ligado"}
          </button>
        </div>
        <p className="mt-5 inline-block rounded-full bg-blue-600 px-3 py-1 text-xs font-bold uppercase tracking-wider">
          Eleições {ANO_ELEICAO}
        </p>
        <h1 className="mt-3 font-display text-5xl font-extrabold uppercase leading-none">
          Cola digital
        </h1>
        <p className="mt-3 max-w-sm text-slate-300">
          Monte sua lista de votos na ordem da urna, baixe em PDF e imprima
          para levar no papel.
        </p>
      </header>

      {/* Aviso legal — sempre visível */}
      <section
        role="note"
        className="mx-6 -mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm"
      >
        <p className="text-lg font-bold text-red-700">
          Imprima e leve no papel
        </p>
        <p className="mt-2 font-semibold text-red-900">
          Não é permitido usar o celular dentro da cabine de votação. O aparelho
          fica com o mesário antes de você votar.
        </p>
        <p className="mt-2 text-sm text-red-800">
          Anotação em papel é permitida. Use esta cola para decidir antes e para
          imprimir — nunca dentro da cabine.
        </p>
      </section>

      <div className="px-6">
        {/* Etapa 1 — Estado */}
        <section className="pt-8" aria-labelledby="etapa-estado">
          <h2 id="etapa-estado" className="text-xl font-bold text-neutral-900">
            1. Escolha seu estado
          </h2>
          <p className="mt-1 text-neutral-600">
            Só aparecem os candidatos do seu estado — menos presidente, que é
            para o Brasil inteiro.
          </p>
          <select
            value={uf}
            onChange={(e) => {
              setUf(e.target.value);
              setPreenchimentos({});
              setFotos({});
            }}
            aria-label="Estado"
            className={`mt-4 w-full rounded-xl border-2 border-neutral-300 bg-white px-4 text-lg font-semibold text-neutral-900 focus:border-blue-600 ${alvoToque}`}
          >
            <option value="">Selecione o estado</option>
            {UFS.map((u) => (
              <option key={u.sigla} value={u.sigla}>
                {u.nome} ({u.sigla})
              </option>
            ))}
          </select>

          {temDados === false && (
            <p
              role="alert"
              className="mt-3 rounded-lg bg-amber-50 px-4 py-3 font-semibold text-amber-900"
            >
              Os candidatos deste estado ainda não foram carregados. Tente de
              novo mais tarde.
            </p>
          )}
        </section>

        {/* Etapa 2 — Números */}
        {uf && (
          <section className="pt-10" aria-labelledby="etapa-numeros">
            <h2 id="etapa-numeros" className="text-xl font-bold text-neutral-900">
              2. Digite os números
            </h2>
            <p className="mt-1 text-neutral-600">
              Na ordem da urna. Preencha só os que quiser.
            </p>

            <div className="mt-4 space-y-4">
              {vagas.map((vaga, indice) => {
                const p = preenchimentos[vaga.id] ?? VAZIO;
                return (
                  <div
                    key={vaga.id}
                    className={`overflow-hidden rounded-2xl border transition-colors ${
                      p.candidato
                        ? "border-emerald-300 bg-emerald-50/40"
                        : "border-neutral-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3 border-b border-neutral-100 bg-neutral-50 px-4 py-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                        {indice + 1}
                      </span>
                      <span className="flex-1 font-semibold text-neutral-900">
                        {vaga.rotulo}
                      </span>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-neutral-500">
                        {vaga.cargo.digitos} dígitos
                      </span>
                    </div>
                    <div className="p-4">

                    <input
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={p.numero}
                      onChange={(e) => aoDigitar(vaga, e.target.value)}
                      placeholder={"0".repeat(vaga.cargo.digitos)}
                      aria-label={`Número para ${vaga.rotulo}`}
                      className={`w-full rounded-xl border-2 border-neutral-300 bg-white px-4 text-center font-display text-4xl font-extrabold tracking-[0.3em] text-neutral-900 focus:border-blue-600 ${alvoToque}`}
                    />

                    {p.buscando && (
                      <p className="mt-2 text-sm text-neutral-500">Procurando…</p>
                    )}

                    {p.candidato && (
                      <div className="mt-3 flex items-center gap-3 rounded-lg bg-emerald-50 p-3">
                        {p.candidato.foto_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={urlFoto(p.candidato.foto_url)!}
                            alt=""
                            className="h-12 w-12 rounded object-cover"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold text-emerald-900">
                            {p.candidato.nome_urna}
                          </p>
                          <p className="text-sm text-emerald-800">
                            {p.candidato.partido ?? ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => limpar(vaga)}
                          className="min-h-12 rounded-lg px-3 text-sm font-semibold text-emerald-900 underline"
                        >
                          Trocar
                        </button>
                      </div>
                    )}

                    {!p.candidato && p.sugestoes.length > 0 && (
                      <ul className="mt-3 space-y-2">
                        {p.sugestoes.map((c) => (
                          <li key={c.id}>
                            <button
                              type="button"
                              onClick={() => escolher(vaga, c)}
                              className={`flex w-full items-center gap-3 rounded-lg border-2 border-neutral-200 p-3 text-left active:bg-neutral-100 ${alvoToque}`}
                            >
                              <span className="font-display text-xl font-extrabold text-neutral-900">
                                {c.numero}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-semibold text-neutral-900">
                                  {c.nome_urna}
                                </span>
                                <span className="block text-sm text-neutral-500">
                                  {c.partido ?? ""}
                                </span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    {!p.candidato &&
                      !p.buscando &&
                      p.numero.length >= 2 &&
                      p.sugestoes.length === 0 && (
                        <p className="mt-2 text-sm font-semibold text-amber-700">
                          Nenhum candidato com esse número. Confira os dígitos.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Etapa 3 — Baixar */}
        {linhas.length > 0 && (
          <section className="pt-10" aria-labelledby="etapa-baixar">
            <h2 id="etapa-baixar" className="text-xl font-bold text-neutral-900">
              3. Baixe e imprima
            </h2>

            <div className="mt-4 rounded-2xl bg-neutral-100 p-4">
              <canvas
                ref={canvasRef}
                role="img"
                aria-label="Prévia da sua cola de votação"
                className="mx-auto w-full rounded-lg bg-white shadow-lg"
                style={{ aspectRatio: `${COLA_W} / ${COLA_H}` }}
              />
            </div>

            <div className="mt-5 grid gap-3">
              <button
                type="button"
                onClick={baixarPdf}
                disabled={gerando}
                className={`w-full rounded-xl bg-blue-600 px-6 text-lg font-bold text-white shadow-sm active:bg-blue-700 disabled:opacity-60 ${alvoToque}`}
              >
                {gerando ? "Gerando…" : "Baixar PDF para imprimir"}
              </button>
              <button
                type="button"
                onClick={baixarImagem}
                disabled={gerando}
                className={`w-full rounded-xl border-2 border-neutral-300 px-6 text-lg font-semibold text-neutral-900 active:bg-neutral-100 disabled:opacity-60 ${alvoToque}`}
              >
                Baixar imagem
              </button>
              <button
                type="button"
                onClick={compartilhar}
                disabled={gerando}
                className={`w-full rounded-xl border-2 border-neutral-300 px-6 text-lg font-semibold text-neutral-900 active:bg-neutral-100 disabled:opacity-60 ${alvoToque}`}
              >
                Compartilhar
              </button>
            </div>

            {aviso && (
              <p
                role="status"
                className="mt-3 rounded-lg bg-emerald-50 px-4 py-3 font-semibold text-emerald-800"
              >
                {aviso}
              </p>
            )}
          </section>
        )}
      </div>

      {/* Imagem pronta: o navegador só salva com um toque direto num link */}
      {imagemPronta && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Sua cola está pronta"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-5"
          onClick={fecharImagem}
        >
          <div
            className="max-h-[92dvh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-5 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-neutral-900">
              Sua cola está pronta!
            </h3>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagemPronta.url}
              alt="Cola de votação gerada"
              className="mx-auto mt-3 max-h-[45dvh] w-auto rounded-lg border border-neutral-200"
            />

            {typeof navigator !== "undefined" &&
            typeof navigator.share === "function" &&
            typeof navigator.canShare === "function" &&
            navigator.canShare({ files: [imagemPronta.arquivo] }) ? (
              <>
                <button
                  type="button"
                  onClick={salvarNaGaleria}
                  className={`mt-4 block w-full rounded-xl bg-blue-600 px-6 text-lg font-bold text-white active:bg-blue-700 ${alvoToque}`}
                >
                  Salvar na galeria
                </button>
                <p className="mt-2 text-sm text-neutral-600">
                  Toque no botão e escolha{" "}
                  <strong>&ldquo;Salvar imagem&rdquo;</strong>.
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm font-semibold text-neutral-700">
                Segure o dedo na imagem e toque em &ldquo;Salvar imagem&rdquo;.
              </p>
            )}

            <a
              href={imagemPronta.url}
              download={imagemPronta.arquivo.name}
              className={`mt-3 flex w-full items-center justify-center rounded-xl border-2 border-neutral-300 px-6 font-semibold text-neutral-700 ${alvoToque}`}
            >
              Baixar arquivo
            </a>
            <p className="mt-1 text-xs text-neutral-500">
              O arquivo fica na pasta Downloads do aparelho.
            </p>

            <button
              type="button"
              onClick={fecharImagem}
              className={`mt-2 w-full rounded-xl font-semibold text-neutral-500 ${alvoToque}`}
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
