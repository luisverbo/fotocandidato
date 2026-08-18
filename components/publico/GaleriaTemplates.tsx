"use client";

import { useEffect, useRef } from "react";
import type {
  CandidatoArte,
  Formato,
  FotoPosicionada,
  Template,
} from "@/lib/templates/types";
import { renderizarMiniatura } from "@/lib/canvas/render";

interface Props {
  templates: Template[];
  foto: FotoPosicionada;
  candidato: CandidatoArte;
  formato: Formato;
  selecionado: string;
  onSelecionar(id: string): void;
}

const LARGURA_MINIATURA = 148;

function Miniatura({
  template,
  foto,
  candidato,
  formato,
  ativo,
  onClick,
}: {
  template: Template;
  foto: FotoPosicionada;
  candidato: CandidatoArte;
  formato: Formato;
  ativo: boolean;
  onClick(): void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const quadro = useRef<number | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (quadro.current !== null) cancelAnimationFrame(quadro.current);
    quadro.current = requestAnimationFrame(() => {
      renderizarMiniatura(
        canvas,
        template,
        foto,
        candidato,
        formato,
        LARGURA_MINIATURA
      );
    });
    return () => {
      if (quadro.current !== null) cancelAnimationFrame(quadro.current);
    };
  }, [template, foto, candidato, formato]);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      aria-label={`Modelo ${template.nome}`}
      className={`shrink-0 snap-start rounded-xl border-4 p-0.5 ${
        ativo ? "border-neutral-900" : "border-transparent"
      }`}
    >
      <canvas
        ref={ref}
        className="block rounded-lg"
        style={{ width: LARGURA_MINIATURA }}
        aria-hidden="true"
      />
      <span className="mt-1 block text-center text-xs font-semibold text-neutral-600">
        {template.nome}
      </span>
    </button>
  );
}

// Miniaturas horizontais roláveis, cada uma renderizando a foto real do
// apoiador já aplicada no modelo.
export default function GaleriaTemplates({
  templates,
  foto,
  candidato,
  formato,
  selecionado,
  onSelecionar,
}: Props) {
  return (
    <div
      className="rolagem-sem-barra -mx-6 flex snap-x gap-3 overflow-x-auto px-6 py-2"
      role="listbox"
      aria-label="Escolha o modelo da arte"
    >
      {templates.map((t) => (
        <Miniatura
          key={t.id}
          template={t}
          foto={foto}
          candidato={candidato}
          formato={formato}
          ativo={t.id === selecionado}
          onClick={() => onSelecionar(t.id)}
        />
      ))}
    </div>
  );
}
