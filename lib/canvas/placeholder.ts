import type { FotoPosicionada } from "@/lib/templates/types";

// Foto fictícia (silhueta neutra) para o preview ao vivo do painel.
let cache: FotoPosicionada | null = null;

export function fotoPlaceholder(): FotoPosicionada {
  if (cache) return cache;

  const w = 1200;
  const h = 1500;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "#9ca3af");
  grad.addColorStop(1, "#6b7280");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "#d1d5db";
  // Cabeça
  ctx.beginPath();
  ctx.arc(w / 2, h * 0.38, w * 0.17, 0, Math.PI * 2);
  ctx.fill();
  // Ombros
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.85, w * 0.34, h * 0.24, 0, Math.PI, 0);
  ctx.fill();

  cache = {
    img: canvas,
    largura: w,
    altura: h,
    ajuste: { offsetX: 0, offsetY: 0, zoom: 1 },
  };
  return cache;
}
