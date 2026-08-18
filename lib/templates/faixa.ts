import type { Template } from "./types";
import {
  ajustarFonte,
  corDeTexto,
  drawFotoCover,
  drawLogo,
  drawTeclasUrna,
  fontDisplay,
  fontTexto,
  rgba,
} from "./helpers";

// Faixa: barra sólida na base com a cor primária, nome grande em condensada,
// número em teclas de urna eletrônica.
export const template: Template = {
  id: "faixa",
  nome: "Faixa",
  suporta: ["feed", "story"],
  draw(ctx, { W, H, u, foto, candidato, formato }) {
    const alturaBarra = (formato === "feed" ? 280 : 340) * u;
    const topoBarra = H - alturaBarra;

    drawFotoCover(ctx, foto, 0, 0, W, topoBarra);

    // Barra e filete de destaque
    ctx.fillStyle = candidato.corPrimaria;
    ctx.fillRect(0, topoBarra, W, alturaBarra);
    ctx.fillStyle = candidato.corSecundaria;
    ctx.fillRect(0, topoBarra, W, 10 * u);

    const corTexto = corDeTexto(candidato.corPrimaria);
    const digitos = candidato.numero.replace(/\D/g, "");
    const tecla = Math.min(96 * u, (W * 0.42) / Math.max(digitos.length, 1));
    const larguraTeclas =
      digitos.length * tecla + (digitos.length - 1) * tecla * 0.12;
    const margem = 48 * u;

    // Nome e cargo à esquerda
    const maxNome = W - larguraTeclas - margem * 3;
    const nome = candidato.nome.toUpperCase();
    ctx.save();
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = corTexto;
    ajustarFonte(ctx, nome, (px) => fontDisplay(px, 800), 108 * u, maxNome);
    ctx.fillText(nome, margem, topoBarra + alturaBarra * 0.52);

    const linhaCargo = [candidato.cargo.toUpperCase(), candidato.partido]
      .filter(Boolean)
      .join(" · ");
    ctx.fillStyle = rgba(corTexto, 0.85);
    ajustarFonte(ctx, linhaCargo, (px) => fontTexto(px, 600), 36 * u, maxNome);
    ctx.fillText(linhaCargo, margem, topoBarra + alturaBarra * 0.78);
    ctx.restore();

    // Número em teclas de urna à direita
    drawTeclasUrna(
      ctx,
      candidato.numero,
      W - margem - larguraTeclas / 2,
      topoBarra + alturaBarra * 0.53,
      tecla,
      candidato.corSecundaria,
      corDeTexto(candidato.corSecundaria)
    );

    if (candidato.logo) {
      drawLogo(ctx, candidato.logo, 40 * u, 40 * u, 110 * u, "left");
    }
  },
};
