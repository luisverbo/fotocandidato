"use client";

import { useEffect, useRef } from "react";
import type {
  CandidatoArte,
  Formato,
  FotoAjuste,
  FotoPosicionada,
  Template,
} from "@/lib/templates/types";
import { renderizarArte, DIMENSOES } from "@/lib/canvas/render";

interface Props {
  template: Template;
  foto: FotoPosicionada;
  candidato: CandidatoArte;
  formato: Formato;
  onAjuste(a: FotoAjuste): void;
}

const ZOOM_MIN = 1;
const ZOOM_MAX = 3;

// Canvas em resolução real com arrastar (1 dedo), pinça (2 dedos) e
// slider de zoom como alternativa acessível.
export default function CanvasAjuste({
  template,
  foto,
  candidato,
  formato,
  onAjuste,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ponteiros = useRef(new Map<number, { x: number; y: number }>());
  const distanciaAnterior = useRef<number | null>(null);
  const quadro = useRef<number | null>(null);

  const { W, H } = DIMENSOES[formato];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (quadro.current !== null) cancelAnimationFrame(quadro.current);
    quadro.current = requestAnimationFrame(() => {
      renderizarArte(canvas, template, foto, candidato, formato);
    });
    return () => {
      if (quadro.current !== null) cancelAnimationFrame(quadro.current);
    };
  }, [template, foto, candidato, formato]);

  function fatorEscala(): number {
    const canvas = canvasRef.current;
    if (!canvas) return 1;
    const rect = canvas.getBoundingClientRect();
    return rect.width > 0 ? W / rect.width : 1;
  }

  function aoPressionar(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    ponteiros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    distanciaAnterior.current = null;
  }

  function aoMover(e: React.PointerEvent<HTMLCanvasElement>) {
    const atual = ponteiros.current.get(e.pointerId);
    if (!atual) return;

    const pontos = ponteiros.current;
    const { ajuste } = foto;

    if (pontos.size === 1) {
      const fator = fatorEscala();
      onAjuste({
        ...ajuste,
        offsetX: ajuste.offsetX + (e.clientX - atual.x) * fator,
        offsetY: ajuste.offsetY + (e.clientY - atual.y) * fator,
      });
    } else if (pontos.size === 2) {
      pontos.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const [a, b] = Array.from(pontos.values());
      const distancia = Math.hypot(a.x - b.x, a.y - b.y);
      if (distanciaAnterior.current !== null && distanciaAnterior.current > 0) {
        const novoZoom = Math.min(
          ZOOM_MAX,
          Math.max(ZOOM_MIN, ajuste.zoom * (distancia / distanciaAnterior.current))
        );
        onAjuste({ ...ajuste, zoom: novoZoom });
      }
      distanciaAnterior.current = distancia;
      return;
    }

    pontos.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  function aoSoltar(e: React.PointerEvent<HTMLCanvasElement>) {
    ponteiros.current.delete(e.pointerId);
    distanciaAnterior.current = null;
  }

  return (
    <div className="w-full">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Prévia da sua arte. Arraste para reposicionar a foto."
        onPointerDown={aoPressionar}
        onPointerMove={aoMover}
        onPointerUp={aoSoltar}
        onPointerCancel={aoSoltar}
        className={`mx-auto block w-full cursor-move shadow-md ${
          formato === "perfil" ? "rounded-full" : "rounded-xl"
        }`}
        style={{
          aspectRatio: `${W} / ${H}`,
          maxWidth:
            formato === "story"
              ? "300px"
              : formato === "perfil"
                ? "360px"
                : "420px",
          touchAction: "none",
        }}
      />
      {formato === "perfil" && (
        <p className="mx-auto mt-3 max-w-[420px] text-center text-sm text-neutral-500">
          É assim que sua foto de perfil vai aparecer. A imagem é salva
          quadrada — a rede social faz o corte redondo.
        </p>
      )}
      <label className="mx-auto mt-4 flex w-full max-w-[420px] items-center gap-3">
        <span className="text-sm font-semibold text-neutral-700">Zoom</span>
        <input
          type="range"
          min={ZOOM_MIN}
          max={ZOOM_MAX}
          step={0.01}
          value={foto.ajuste.zoom}
          onChange={(e) =>
            onAjuste({ ...foto.ajuste, zoom: Number(e.target.value) })
          }
          aria-label="Zoom da foto"
          className="h-12 w-full accent-neutral-800"
        />
      </label>
      <p className="mt-1 text-center text-sm text-neutral-500">
        Arraste com o dedo para ajustar a posição da foto
      </p>
    </div>
  );
}
