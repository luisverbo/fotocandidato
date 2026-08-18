import type { FotoPosicionada } from "./types";

export function fontDisplay(px: number, weight: 700 | 800 = 800): string {
  return `${weight} ${px}px "Barlow Condensed", "Arial Narrow", sans-serif`;
}

export function fontTexto(px: number, weight: 500 | 600 | 700 = 600): string {
  return `${weight} ${px}px Archivo, system-ui, sans-serif`;
}

// Reduz o tamanho da fonte até o texto caber em maxWidth. Retorna o px final
// e já deixa ctx.font configurado.
export function ajustarFonte(
  ctx: CanvasRenderingContext2D,
  texto: string,
  fonteDe: (px: number) => string,
  alvoPx: number,
  maxWidth: number,
  minimoPx?: number
): number {
  const minimo = minimoPx ?? alvoPx * 0.35;
  let px = alvoPx;
  ctx.font = fonteDe(px);
  while (px > minimo && ctx.measureText(texto).width > maxWidth) {
    px -= Math.max(1, px * 0.05);
    ctx.font = fonteDe(px);
  }
  return px;
}

// Desenha a foto cobrindo o retângulo (modo cover), aplicando o ajuste de
// arrastar/zoom do apoiador, sem nunca deixar borda vazia.
export function drawFotoCover(
  ctx: CanvasRenderingContext2D,
  foto: FotoPosicionada,
  dx: number,
  dy: number,
  dw: number,
  dh: number
): void {
  const { img, largura, altura, ajuste } = foto;
  const escala = Math.max(dw / largura, dh / altura) * Math.max(1, ajuste.zoom);
  const w = largura * escala;
  const h = altura * escala;
  let x = dx + (dw - w) / 2 + ajuste.offsetX;
  let y = dy + (dh - h) / 2 + ajuste.offsetY;
  x = Math.min(dx, Math.max(dx + dw - w, x));
  y = Math.min(dy, Math.max(dy + dh - h, y));

  ctx.save();
  ctx.beginPath();
  ctx.rect(dx, dy, dw, dh);
  ctx.clip();
  ctx.drawImage(img, x, y, w, h);
  ctx.restore();
}

export function pathRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const raio = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, raio);
    return;
  }
  ctx.moveTo(x + raio, y);
  ctx.arcTo(x + w, y, x + w, y + h, raio);
  ctx.arcTo(x + w, y + h, x, y + h, raio);
  ctx.arcTo(x, y + h, x, y, raio);
  ctx.arcTo(x, y, x + w, y, raio);
  ctx.closePath();
}

function hexParaRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  if (Number.isNaN(n) || h.length !== 6) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexParaRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Preto ou branco, o que tiver mais contraste sobre a cor dada.
export function corDeTexto(hexFundo: string): string {
  const [r, g, b] = hexParaRgb(hexFundo);
  const luminancia = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminancia > 150 ? "#111111" : "#ffffff";
}

// Número em "teclas de urna eletrônica": um quadrado arredondado por dígito.
// Desenha centrado em (cx, cy). Retorna a largura total ocupada.
export function drawTeclasUrna(
  ctx: CanvasRenderingContext2D,
  numero: string,
  cx: number,
  cy: number,
  tamanhoTecla: number,
  corTecla: string,
  corDigito: string
): number {
  const digitos = numero.replace(/\D/g, "").split("");
  if (digitos.length === 0) return 0;

  const gap = tamanhoTecla * 0.12;
  const total = digitos.length * tamanhoTecla + (digitos.length - 1) * gap;
  let x = cx - total / 2;
  const y = cy - tamanhoTecla / 2;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const d of digitos) {
    pathRoundRect(ctx, x, y, tamanhoTecla, tamanhoTecla, tamanhoTecla * 0.16);
    ctx.fillStyle = corTecla;
    ctx.fill();
    ctx.fillStyle = corDigito;
    ctx.font = fontDisplay(tamanhoTecla * 0.72, 800);
    ctx.fillText(d, x + tamanhoTecla / 2, y + tamanhoTecla / 2 + tamanhoTecla * 0.04);
    x += tamanhoTecla + gap;
  }
  ctx.restore();
  return total;
}

function dimensoesImagem(img: CanvasImageSource): { w: number; h: number } {
  const el = img as HTMLImageElement | HTMLCanvasElement | ImageBitmap;
  const w = "naturalWidth" in el && el.naturalWidth ? el.naturalWidth : el.width;
  const h =
    "naturalHeight" in el && el.naturalHeight ? el.naturalHeight : el.height;
  return { w: Number(w) || 1, h: Number(h) || 1 };
}

// Desenha a logo com altura fixa, mantendo proporção.
// x é a âncora horizontal conforme o alinhamento.
export function drawLogo(
  ctx: CanvasRenderingContext2D,
  logo: CanvasImageSource,
  x: number,
  y: number,
  altura: number,
  align: "left" | "center" | "right" = "left"
): void {
  const { w, h } = dimensoesImagem(logo);
  const largura = (w / h) * altura;
  const dx =
    align === "left" ? x : align === "right" ? x - largura : x - largura / 2;
  ctx.drawImage(logo, dx, y, largura, altura);
}

// Largura útil (corda) de um círculo de diâmetro W na altura y.
// Usada no formato "perfil" para manter o conteúdo dentro do corte redondo.
export function cordaCirculo(W: number, y: number): number {
  const r = W / 2;
  const dy = Math.abs(y - r);
  if (dy >= r) return 0;
  return 2 * Math.sqrt(r * r - dy * dy);
}

// Pill de destaque (etiqueta arredondada) com texto centrado em (cx, cy).
export function drawPill(
  ctx: CanvasRenderingContext2D,
  texto: string,
  cx: number,
  cy: number,
  alturaPill: number,
  fontPx: number,
  corFundo: string,
  corTextoPill: string,
  maxWidth: number
): void {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ajustarFonte(ctx, texto, (px) => fontTexto(px, 700), fontPx, maxWidth);
  const largura = ctx.measureText(texto).width + alturaPill * 1.1;
  pathRoundRect(
    ctx,
    cx - largura / 2,
    cy - alturaPill / 2,
    largura,
    alturaPill,
    alturaPill / 2
  );
  ctx.fillStyle = corFundo;
  ctx.fill();
  ctx.fillStyle = corTextoPill;
  ctx.fillText(texto, cx, cy + alturaPill * 0.03);
  ctx.restore();
}
