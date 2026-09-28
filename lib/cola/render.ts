import {
  ajustarFonte,
  drawTeclasUrna,
  fontDisplay,
  fontTexto,
  pathRoundRect,
} from "@/lib/templates/helpers";
import type { CandidatoCola } from "./busca";
import { ANO_ELEICAO, type DefinicaoCargo } from "./cargos";

// A4 em 150 dpi — mesma arte serve para PNG e para o PDF.
export const COLA_W = 1240;
export const COLA_H = 1754;

const TINTA = "#111827";
const CINZA = "#6b7280";
const DESTAQUE = "#1d4ed8";
const ALERTA = "#b91c1c";

export interface LinhaCola {
  cargo: DefinicaoCargo;
  rotulo: string;
  candidato: CandidatoCola | null;
  numeroDigitado: string;
  foto: CanvasImageSource | null;
}

function drawFotoQuadrada(
  ctx: CanvasRenderingContext2D,
  foto: CanvasImageSource | null,
  x: number,
  y: number,
  lado: number,
  inicial: string
) {
  ctx.save();
  pathRoundRect(ctx, x, y, lado, lado, 12);
  ctx.clip();
  if (foto) {
    const el = foto as HTMLImageElement;
    const w = el.naturalWidth || lado;
    const h = el.naturalHeight || lado;
    const escala = Math.max(lado / w, lado / h);
    ctx.drawImage(
      foto,
      x + (lado - w * escala) / 2,
      y + (lado - h * escala) / 2,
      w * escala,
      h * escala
    );
  } else {
    ctx.fillStyle = "#e5e7eb";
    ctx.fillRect(x, y, lado, lado);
    ctx.fillStyle = "#9ca3af";
    ctx.font = fontDisplay(lado * 0.5, 800);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(inicial, x + lado / 2, y + lado / 2);
  }
  ctx.restore();
  ctx.strokeStyle = "#d1d5db";
  ctx.lineWidth = 2;
  pathRoundRect(ctx, x, y, lado, lado, 12);
  ctx.stroke();
}

export function desenharCola(
  canvas: HTMLCanvasElement,
  uf: string,
  linhas: LinhaCola[]
): void {
  canvas.width = COLA_W;
  canvas.height = COLA_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, COLA_W, COLA_H);

  const margem = 70;
  const larguraUtil = COLA_W - margem * 2;

  // ---------- Cabeçalho ----------
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = TINTA;
  ctx.font = fontDisplay(76, 800);
  ctx.fillText("MINHA COLA DE VOTAÇÃO", margem, 118);

  ctx.fillStyle = CINZA;
  ctx.font = fontTexto(28, 600);
  ctx.fillText(`Eleições ${ANO_ELEICAO} · ${uf}`, margem, 162);

  ctx.fillStyle = DESTAQUE;
  ctx.fillRect(margem, 186, larguraUtil, 5);

  // ---------- Aviso legal ----------
  const avisoY = 216;
  const avisoH = 150;
  pathRoundRect(ctx, margem, avisoY, larguraUtil, avisoH, 16);
  ctx.fillStyle = "#fef2f2";
  ctx.fill();
  ctx.strokeStyle = ALERTA;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = ALERTA;
  ctx.font = fontTexto(30, 700);
  ctx.fillText("IMPRIMA E LEVE NO PAPEL", margem + 28, avisoY + 50);

  ctx.fillStyle = "#7f1d1d";
  ctx.font = fontTexto(23, 500);
  ctx.fillText(
    "Não é permitido usar o celular dentro da cabine de votação.",
    margem + 28,
    avisoY + 90
  );
  ctx.fillText(
    "O aparelho fica com o mesário. Anotação em papel é permitida.",
    margem + 28,
    avisoY + 124
  );

  // ---------- Linhas dos cargos ----------
  const topo = avisoY + avisoH + 40;
  const alturaLinha = Math.min(
    196,
    (COLA_H - topo - 120) / Math.max(linhas.length, 1)
  );

  linhas.forEach((linha, indice) => {
    const y = topo + indice * alturaLinha;
    const alturaCaixa = alturaLinha - 16;

    pathRoundRect(ctx, margem, y, larguraUtil, alturaCaixa, 16);
    ctx.fillStyle = indice % 2 === 0 ? "#f9fafb" : "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Ordem de votação
    ctx.fillStyle = DESTAQUE;
    ctx.font = fontDisplay(40, 800);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(indice + 1), margem + 38, y + alturaCaixa / 2);

    const ladoFoto = alturaCaixa - 40;
    const xFoto = margem + 72;
    drawFotoQuadrada(
      ctx,
      linha.foto,
      xFoto,
      y + 20,
      ladoFoto,
      (linha.candidato?.nome_urna ?? "?").charAt(0).toUpperCase()
    );

    const xTexto = xFoto + ladoFoto + 26;
    const digitos = (linha.candidato?.numero ?? linha.numeroDigitado).replace(
      /\D/g,
      ""
    );
    const tecla = 62;
    const larguraTeclas = digitos.length
      ? digitos.length * tecla + (digitos.length - 1) * tecla * 0.12
      : 0;
    const larguraTexto = larguraUtil - (xTexto - margem) - larguraTeclas - 50;

    ctx.textAlign = "left";
    ctx.fillStyle = CINZA;
    ctx.font = fontTexto(22, 700);
    ctx.fillText(linha.rotulo.toUpperCase(), xTexto, y + 48);

    ctx.fillStyle = TINTA;
    const nome = (linha.candidato?.nome_urna ?? "Não preenchido").toUpperCase();
    ajustarFonte(ctx, nome, (px) => fontDisplay(px, 800), 54, larguraTexto);
    ctx.textBaseline = "middle";
    ctx.fillText(nome, xTexto, y + alturaCaixa / 2 + 14);

    if (linha.candidato?.partido) {
      ctx.fillStyle = CINZA;
      ctx.font = fontTexto(22, 600);
      ctx.textBaseline = "alphabetic";
      ctx.fillText(linha.candidato.partido, xTexto, y + alturaCaixa - 26);
    }

    if (digitos.length > 0) {
      drawTeclasUrna(
        ctx,
        digitos,
        margem + larguraUtil - 30 - larguraTeclas / 2,
        y + alturaCaixa / 2,
        tecla,
        DESTAQUE,
        "#ffffff"
      );
    }
  });

  // ---------- Rodapé ----------
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = CINZA;
  ctx.font = fontTexto(22, 500);
  ctx.fillText(
    "Confira os números na urna antes de confirmar. Dados públicos do TSE.",
    COLA_W / 2,
    COLA_H - 58
  );
}
