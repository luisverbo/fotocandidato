"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Candidato } from "@/lib/types";
import type {
  CandidatoArte,
  Formato,
  FotoAjuste,
  FotoPosicionada,
} from "@/lib/templates/types";
import { templates as todosTemplates } from "@/lib/templates";
import { corDeTexto } from "@/lib/templates/helpers";
import {
  carregarFoto,
  carregarImagemUrl,
  ErroFoto,
  type FotoCarregada,
} from "@/lib/canvas/foto";
import { aguardarFontes } from "@/lib/canvas/fontes";
import {
  candidatoParaArte,
  canvasParaBlob,
  renderizarArte,
} from "@/lib/canvas/render";
import { registrarGeracao } from "@/lib/metricas";
import CanvasAjuste from "./CanvasAjuste";
import GaleriaTemplates from "./GaleriaTemplates";

const AJUSTE_INICIAL: FotoAjuste = { offsetX: 0, offsetY: 0, zoom: 1 };

interface Props {
  candidato: Candidato;
}

export default function FluxoApoiador({ candidato }: Props) {
  const [foto, setFoto] = useState<FotoCarregada | null>(null);
  const [ajuste, setAjuste] = useState<FotoAjuste>(AJUSTE_INICIAL);
  const [formato, setFormato] = useState<Formato>("feed");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [fontesProntas, setFontesProntas] = useState(false);
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);

  const inputCameraRef = useRef<HTMLInputElement>(null);
  const inputGaleriaRef = useRef<HTMLInputElement>(null);
  const etapa2Ref = useRef<HTMLDivElement>(null);

  const templatesAtivos = useMemo(
    () =>
      todosTemplates.filter(
        (t) =>
          candidato.templates_ativos.includes(t.id) && t.suporta.includes(formato)
      ),
    [candidato.templates_ativos, formato]
  );
  const [templateId, setTemplateId] = useState<string>(
    () => templatesAtivos[0]?.id ?? "faixa"
  );
  const template =
    templatesAtivos.find((t) => t.id === templateId) ?? templatesAtivos[0];

  useEffect(() => {
    aguardarFontes().then(() => setFontesProntas(true));
  }, []);

  useEffect(() => {
    if (candidato.logo_url) {
      carregarImagemUrl(candidato.logo_url).then(setLogo);
    }
  }, [candidato.logo_url]);

  const arte: CandidatoArte = useMemo(
    () => candidatoParaArte(candidato, logo),
    [candidato, logo]
  );

  const fotoPosicionada: FotoPosicionada | null = useMemo(
    () => (foto ? { ...foto, ajuste } : null),
    [foto, ajuste]
  );

  async function aoEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;

    setErro(null);
    setAviso(null);
    setProcessando(true);
    try {
      const carregada = await carregarFoto(arquivo);
      setFoto(carregada);
      setAjuste(AJUSTE_INICIAL);
      requestAnimationFrame(() => {
        etapa2Ref.current?.scrollIntoView({ block: "start" });
      });
    } catch (err) {
      if (err instanceof ErroFoto && err.codigo === "nao-imagem") {
        setErro("Esse arquivo não é uma foto. Escolha uma imagem.");
      } else {
        setErro("Não conseguimos abrir essa foto. Tente outra.");
      }
    } finally {
      setProcessando(false);
    }
  }

  async function gerarArquivo(): Promise<File | null> {
    if (!fotoPosicionada || !template) return null;
    await aguardarFontes();
    const canvas = document.createElement("canvas");
    renderizarArte(canvas, template, fotoPosicionada, arte, formato);
    const blob = await canvasParaBlob(canvas);
    return new File([blob], `santinho-${candidato.slug}-${formato}.jpg`, {
      type: "image/jpeg",
    });
  }

  async function baixar() {
    if (gerando) return;
    setGerando(true);
    setAviso(null);
    registrarGeracao(candidato.id, template?.id ?? "", formato, "download");
    try {
      const arquivo = await gerarArquivo();
      if (!arquivo) return;
      const url = URL.createObjectURL(arquivo);
      const a = document.createElement("a");
      a.href = url;
      a.download = arquivo.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setAviso("Imagem salva. Agora é só postar!");
    } catch {
      setErro("Algo deu errado ao gerar a imagem. Tente de novo.");
    } finally {
      setGerando(false);
    }
  }

  async function compartilhar() {
    if (gerando) return;
    setGerando(true);
    setAviso(null);
    registrarGeracao(candidato.id, template?.id ?? "", formato, "share");
    try {
      const arquivo = await gerarArquivo();
      if (!arquivo) return;

      if (
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [arquivo] })
      ) {
        try {
          await navigator.share({
            files: [arquivo],
            title: `${candidato.nome} ${candidato.numero}`,
          });
        } catch (err) {
          if ((err as DOMException)?.name !== "AbortError") {
            throw err;
          }
        }
      } else {
        // Navegador sem Web Share: cai para download.
        const url = URL.createObjectURL(arquivo);
        const a = document.createElement("a");
        a.href = url;
        a.download = arquivo.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
        setAviso("Seu celular não abre o menu de compartilhar por aqui. A imagem foi salva — poste direto da galeria.");
      }
    } catch {
      setErro("Algo deu errado ao gerar a imagem. Tente de novo.");
    } finally {
      setGerando(false);
    }
  }

  const corHeader = candidato.cor_primaria;
  const corHeaderTexto = corDeTexto(corHeader);

  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl bg-white pb-16">
      {/* Cabeçalho com a identidade do candidato */}
      <header
        className="px-6 py-5 text-center"
        style={{ backgroundColor: corHeader, color: corHeaderTexto }}
      >
        <p className="text-sm font-semibold opacity-90">Apoie</p>
        <h1 className="font-display text-3xl font-extrabold uppercase leading-tight">
          {candidato.nome} · {candidato.numero}
        </h1>
        <p className="text-sm font-semibold opacity-90">
          {candidato.cargo}
          {candidato.partido ? ` · ${candidato.partido}` : ""}
        </p>
      </header>

      <div className="px-6">
        {/* Etapa 1 — Foto */}
        <section className="pt-8" aria-labelledby="etapa-foto">
          <h2 id="etapa-foto" className="text-xl font-bold text-neutral-900">
            1. Coloque sua foto
          </h2>
          <p className="mt-1 text-neutral-600">
            Sua foto não sai do seu celular. Ninguém além de você vê.
          </p>

          <input
            ref={inputCameraRef}
            type="file"
            accept="image/*"
            capture="user"
            className="sr-only"
            onChange={aoEscolherArquivo}
            aria-label="Tirar foto agora"
          />
          <input
            ref={inputGaleriaRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={aoEscolherArquivo}
            aria-label="Escolher foto da galeria"
          />

          <div className="mt-4 grid gap-3">
            <button
              type="button"
              onClick={() => inputCameraRef.current?.click()}
              disabled={processando}
              className="min-h-14 w-full rounded-xl bg-neutral-900 px-6 text-lg font-semibold text-white active:bg-neutral-700 disabled:opacity-60"
            >
              Tirar foto agora
            </button>
            <button
              type="button"
              onClick={() => inputGaleriaRef.current?.click()}
              disabled={processando}
              className="min-h-14 w-full rounded-xl border-2 border-neutral-300 px-6 text-lg font-semibold text-neutral-900 active:bg-neutral-100 disabled:opacity-60"
            >
              Escolher da galeria
            </button>
          </div>

          {processando && (
            <p role="status" className="mt-3 text-neutral-600">
              Preparando sua foto…
            </p>
          )}
          {erro && (
            <p
              role="alert"
              className="mt-3 rounded-lg bg-red-50 px-4 py-3 font-semibold text-red-700"
            >
              {erro}
            </p>
          )}
          {foto && !processando && (
            <p className="mt-3 text-sm font-semibold text-emerald-700">
              Foto pronta! Ajuste aí embaixo.
            </p>
          )}
        </section>

        {/* Etapa 2 — Ajustar e escolher modelo */}
        {fotoPosicionada && template && (
          <section
            ref={etapa2Ref}
            className="scroll-mt-4 pt-10"
            aria-labelledby="etapa-ajustar"
          >
            <h2 id="etapa-ajustar" className="text-xl font-bold text-neutral-900">
              2. Ajuste e escolha o modelo
            </h2>

            <div
              className="mt-4 grid grid-cols-2 gap-2"
              role="group"
              aria-label="Formato da arte"
            >
              {(
                [
                  ["feed", "Feed / Perfil"],
                  ["story", "Story / Status"],
                ] as [Formato, string][]
              ).map(([f, rotulo]) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={formato === f}
                  onClick={() => setFormato(f)}
                  className={`min-h-12 rounded-xl border-2 px-4 font-semibold ${
                    formato === f
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-300 text-neutral-700"
                  }`}
                >
                  {rotulo}
                </button>
              ))}
            </div>

            <div className="mt-5">
              {fontesProntas ? (
                <CanvasAjuste
                  template={template}
                  foto={fotoPosicionada}
                  candidato={arte}
                  formato={formato}
                  onAjuste={setAjuste}
                />
              ) : (
                <p role="status" className="py-10 text-center text-neutral-600">
                  Carregando a arte…
                </p>
              )}
            </div>

            <div className="mt-4">
              <GaleriaTemplates
                templates={templatesAtivos}
                foto={fotoPosicionada}
                candidato={arte}
                formato={formato}
                selecionado={template.id}
                onSelecionar={setTemplateId}
              />
            </div>

            <button
              type="button"
              onClick={() => inputGaleriaRef.current?.click()}
              className="mt-2 min-h-12 text-sm font-semibold text-neutral-600 underline underline-offset-4"
            >
              Trocar foto
            </button>
          </section>
        )}

        {/* Etapa 3 — Publicar */}
        {fotoPosicionada && template && (
          <section className="pt-10" aria-labelledby="etapa-publicar">
            <h2 id="etapa-publicar" className="text-xl font-bold text-neutral-900">
              3. Publique
            </h2>
            <div className="mt-4 grid gap-3">
              <button
                type="button"
                onClick={compartilhar}
                disabled={gerando}
                className="min-h-14 w-full rounded-xl px-6 text-lg font-bold disabled:opacity-60"
                style={{
                  backgroundColor: candidato.cor_primaria,
                  color: corHeaderTexto,
                }}
              >
                {gerando ? "Gerando…" : "Compartilhar"}
              </button>
              <button
                type="button"
                onClick={baixar}
                disabled={gerando}
                className="min-h-14 w-full rounded-xl border-2 border-neutral-300 px-6 text-lg font-semibold text-neutral-900 active:bg-neutral-100 disabled:opacity-60"
              >
                Baixar imagem
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
    </main>
  );
}
