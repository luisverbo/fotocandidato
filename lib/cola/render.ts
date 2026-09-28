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

const TINTA = "#0f172a";
const CINZA = "#64748b";
const AZUL = "#1d4ed8";
const AZUL_CLARO = "#eff6ff";
const ALERTA = "#b91c1c";

export interface LinhaCola {
  cargo: DefinicaoCargo;
  rotulo: string;
  candidato: CandidatoCola | null;
  numeroDigitado: string;
  foto: CanvasImageSource | null;
}

function drawFoto(
  ctx: CanvasRenderingContext2D,
  foto: CanvasImageSource | null,
  x: number,
  y: number,
  lado: number,
  inicial: string
) {
  ctx.save();
  pathRoundRect(ctx, x, y, lado, lado, lado * 0.22);
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
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(x, y, lado, lado);
    ctx.fillStyle = "#94a3b8";
    ctx.font = fontDisplay(lado * 0.52, 800);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(inicial, x + lado / 2, y + lado / 2 + lado * 0.03);
  }
  ctx.restore();
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

  const margem = 64;
  const larguraUtil = COLA_W - margem * 2;

  // ---------- Faixa do cabeçalho ----------
  const alturaTopo = 210;
  ctx.fillStyle = TINTA;
  ctx.fillRect(0, 0, COLA_W, alturaTopo);
  ctx.fillStyle = AZUL;
  ctx.fillRect(0, alturaTopo - 10, COLA_W, 10);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  ctx.font = fontDisplay(80, 800);
  ctx.fillText("MINHA COLA DE VOTAÇÃO", margem, 116);

  ctx.fillStyle = "#cbd5e1";
  ctx.font = fontTexto(26, 600);
  ctx.fillText(`Eleições ${ANO_ELEICAO}`, margem, 162);

  // Selo da UF
  const seloW = 118;
  const seloH = 76;
  pathRoundRect(ctx, COLA_W - margem - seloW, 74, seloW, seloH, 14);
  ctx.fillStyle = AZUL;
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = fontDisplay(52, 800);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(uf, COLA_W - margem - seloW / 2, 74 + seloH / 2 + 3);

  // ---------- Linhas dos cargos ----------
  const avisoH = 176;
  const topo = alturaTopo + 44;
  const espacoLista = COLA_H - topo - avisoH - 96;
  const alturaLinha = Math.min(188, espacoLista / Math.max(linhas.length, 1));

  linhas.forEach((linha, indice) => {
    const y = topo + indice * alturaLinha;
    const caixaH = alturaLinha - 14;

    pathRoundRect(ctx, margem, y, larguraUtil, caixaH, 18);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Faixa azul da ordem de votação
    ctx.save();
    pathRoundRect(ctx, margem, y, larguraUtil, caixaH, 18);
    ctx.clip();
    ctx.fillStyle = AZUL_CLARO;
    ctx.fillRect(margem, y, 74, caixaH);
    ctx.fillStyle = AZUL;
    ctx.fillRect(margem, y, 6, caixaH);
    ctx.restore();

    ctx.fillStyle = AZUL;
    ctx.font = fontDisplay(46, 800);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(indice + 1), margem + 40, y + caixaH / 2);

    const ladoFoto = caixaH - 44;
    const xFoto = margem + 96;
    drawFoto(
      ctx,
      linha.foto,
      xFoto,
      y + 22,
      ladoFoto,
      (linha.candidato?.nome_urna ?? "?").charAt(0).toUpperCase()
    );

    const digitos = (linha.candidato?.numero ?? linha.numeroDigitado).replace(
      /\D/g,
      ""
    );
    const tecla = 64;
    const larguraTeclas = digitos.length
      ? digitos.length * tecla + (digitos.length - 1) * tecla * 0.12
      : 0;

    const xTexto = xFoto + ladoFoto + 28;
    const larguraTexto = larguraUtil - (xTexto - margem) - larguraTeclas - 56;

    ctx.textAlign = "left";
    ctx.fillStyle = CINZA;
    ctx.font = fontTexto(21, 700);
    ctx.textBaseline = "alphabetic";
    ctx.fillText(linha.rotulo.toUpperCase(), xTexto, y + 46);

    ctx.fillStyle = TINTA;
    const nome = (linha.candidato?.nome_urna ?? "Não preenchido").toUpperCase();
    ajustarFonte(ctx, nome, (px) => fontDisplay(px, 800), 52, larguraTexto);
    ctx.textBaseline = "middle";
    ctx.fillText(nome, xTexto, y + caixaH / 2 + 12);

    if (linha.candidato?.partido) {
      ctx.textBaseline = "alphabetic";
      ctx.font = fontTexto(20, 700);
      const largura = ctx.measureText(linha.candidato.partido).width + 28;
      pathRoundRect(ctx, xTexto, y + caixaH - 52, largura, 34, 17);
      ctx.fillStyle = "#f1f5f9";
      ctx.fill();
      ctx.fillStyle = CINZA;
      ctx.textBaseline = "middle";
      ctx.fillText(
        linha.candidato.partido,
        xTexto + 14,
        y + caixaH - 52 + 18
      );
    }

    if (digitos.length > 0) {
      drawTeclasUrna(
        ctx,
        digitos,
        margem + larguraUtil - 32 - larguraTeclas / 2,
        y + caixaH / 2,
        tecla,
        AZUL,
        "#ffffff"
      );
    }
  });

  // ---------- Aviso legal no rodapé ----------
  const avisoY = COLA_H - avisoH - 64;
  pathRoundRect(ctx, margem, avisoY, larguraUtil, avisoH, 18);
  ctx.fillStyle = "#fef2f2";
  ctx.fill();
  ctx.strokeStyle = ALERTA;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = ALERTA;
  ctx.font = fontTexto(30, 700);
  ctx.fillText("IMPRIMA E LEVE NO PAPEL", margem + 30, avisoY + 52);

  ctx.fillStyle = "#7f1d1d";
  ctx.font = fontTexto(22, 500);
  ctx.fillText(
    "Não é permitido usar o celular dentro da cabine de votação — o aparelho",
    margem + 30,
    avisoY + 92
  );
  ctx.fillText(
    "fica com o mesário. Anotação em papel é permitida. Confira os números",
    margem + 30,
    avisoY + 124
  );
  ctx.fillText("na urna antes de confirmar.", margem + 30, avisoY + 156);
}
