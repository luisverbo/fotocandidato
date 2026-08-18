import type { Template } from "./types";
import {
  ajustarFonte,
  corDeTexto,
  cordaCirculo,
  drawFotoCover,
  drawLogo,
  drawPill,
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
  suporta: ["feed", "story", "perfil"],
  draw(ctx, { W, H, u, foto, candidato, formato }) {
    if (formato === "perfil") {
      // Versão circular: barra vira um segmento na base do círculo,
      // com nome e teclas centralizados na área segura do corte redondo.
      const alturaBarra = 360 * u;
      const topoBarra = H - alturaBarra;
      drawFotoCover(ctx, foto, 0, 0, W, topoBarra);
      ctx.fillStyle = candidato.corPrimaria;
      ctx.fillRect(0, topoBarra, W, alturaBarra);
      ctx.fillStyle = candidato.corSecundaria;
      ctx.fillRect(0, topoBarra, W, 10 * u);

      const corTexto = corDeTexto(candidato.corPrimaria);

      // Cargo em destaque: pill na borda da barra
      const linhaCargo = [candidato.cargo.toUpperCase(), candidato.partido]
        .filter(Boolean)
        .join(" · ");
      drawPill(
        ctx,
        linhaCargo,
        W / 2,
        topoBarra,
        64 * u,
        30 * u,
        candidato.corSecundaria,
        corDeTexto(candidato.corSecundaria),
        cordaCirculo(W, topoBarra) - 160 * u
      );

      const nome = candidato.nome.toUpperCase();
      const yNome = topoBarra + 118 * u;
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = corTexto;
      ajustarFonte(
        ctx,
        nome,
        (px) => fontDisplay(px, 800),
        72 * u,
        cordaCirculo(W, yNome) - 90 * u
      );
      ctx.fillText(nome, W / 2, yNome);
      ctx.restore();

      const digitos = candidato.numero.replace(/\D/g, "");
      const n = Math.max(digitos.length, 1);
      const yTeclas = topoBarra + 212 * u;
      const tecla = Math.min(
        94 * u,
        (cordaCirculo(W, yTeclas + 55 * u) - 60 * u) / (n + (n - 1) * 0.12)
      );
      drawTeclasUrna(
        ctx,
        candidato.numero,
        W / 2,
        yTeclas,
        tecla,
        candidato.corSecundaria,
        corDeTexto(candidato.corSecundaria)
      );

      if (candidato.logo) {
        drawLogo(ctx, candidato.logo, W / 2, 60 * u, 100 * u, "center");
      }
      return;
    }

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
