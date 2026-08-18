"use client";

import { useEffect, useRef, useState } from "react";
import { templates } from "@/lib/templates";
import { candidatoParaArte, renderizarMiniatura } from "@/lib/canvas/render";
import { fotoPlaceholder } from "@/lib/canvas/placeholder";
import { aguardarFontes } from "@/lib/canvas/fontes";

export interface DadosPreview {
  nome: string;
  numero: string;
  cargo: string;
  partido: string;
  slogan: string;
  cor_primaria: string;
  cor_secundaria: string;
}

interface Props {
  dados: DadosPreview;
  templatesAtivos: string[];
  logo: HTMLImageElement | null;
}

const LARGURA = 340;

// Preview ao vivo do formulário: enquanto o organizador digita, o canvas
// mostra como a arte vai ficar (com uma silhueta no lugar da foto).
export default function PreviewArte({ dados, templatesAtivos, logo }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const quadro = useRef<number | null>(null);
  const [fontesProntas, setFontesProntas] = useState(false);
  const [templateId, setTemplateId] = useState<string>(
    templatesAtivos[0] ?? "faixa"
  );

  const disponiveis = templates.filter((t) => templatesAtivos.includes(t.id));
  const template =
    disponiveis.find((t) => t.id === templateId) ?? disponiveis[0] ?? templates[0];

  useEffect(() => {
    aguardarFontes().then(() => setFontesProntas(true));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !fontesProntas) return;
    if (quadro.current !== null) cancelAnimationFrame(quadro.current);
    quadro.current = requestAnimationFrame(() => {
      const arte = candidatoParaArte(
        {
          nome: dados.nome || "Nome do Candidato",
          numero: dados.numero || "00000",
          cargo: dados.cargo || "Cargo",
          partido: dados.partido || null,
          slogan: dados.slogan || null,
          cor_primaria: dados.cor_primaria,
          cor_secundaria: dados.cor_secundaria,
        },
        logo
      );
      renderizarMiniatura(canvas, template, fotoPlaceholder(), arte, "feed", LARGURA);
    });
    return () => {
      if (quadro.current !== null) cancelAnimationFrame(quadro.current);
    };
  }, [dados, template, logo, fontesProntas]);

  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-zinc-400">
        Preview ao vivo
      </p>
      <canvas
        ref={canvasRef}
        className="w-full max-w-[340px] rounded-lg border border-zinc-800"
        style={{ aspectRatio: "1 / 1" }}
        role="img"
        aria-label="Prévia da arte com os dados preenchidos"
      />
      <div className="mt-3 flex flex-wrap gap-1.5">
        {disponiveis.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTemplateId(t.id)}
            aria-pressed={t.id === template?.id}
            className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${
              t.id === template?.id
                ? "bg-zinc-100 text-zinc-900"
                : "border border-zinc-700 text-zinc-400 hover:bg-zinc-800"
            }`}
          >
            {t.nome}
          </button>
        ))}
      </div>
    </div>
  );
}
