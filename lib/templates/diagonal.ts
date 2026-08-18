import type { Template } from "./types";
import {
  ajustarFonte,
  corDeTexto,
  cordaCirculo,
  drawFotoCover,
  drawLogo,
  drawTeclasUrna,
  fontDisplay,
  fontTexto,
  rgba,
} from "./helpers";

// Diagonal: corte diagonal na parte inferior separando foto e bloco de cor,
// número na diagonal.
export const template: Template = {
  id: "diagonal",
  nome: "Diagonal",
  suporta: ["feed", "story", "perfil"],
  draw(ctx, { W, H, u, foto, candidato, formato }) {
    if (formato === "perfil") {
      // Versão circular: mesma pegada da Faixa, mas o bloco de cor sobe
      // com uma curva suave no centro, em vez da barra reta.
      const alturaBloco = 380 * u;
      const topoBloco = H - alturaBloco;
      const curva = 95 * u;

      drawFotoCover(ctx, foto, 0, 0, W, H);

      // Bloco com topo curvo
      ctx.beginPath();
      ctx.moveTo(0, topoBloco + curva);
      ctx.quadraticCurveTo(W / 2, topoBloco - curva, W, topoBloco + curva);
      ctx.lineTo(W, H);
      ctx.lineTo(0, H);
      ctx.closePath();
      ctx.fillStyle = candidato.corPrimaria;
      ctx.fill();

      // Filete de destaque acompanhando a curva
      ctx.beginPath();
      ctx.moveTo(0, topoBloco + curva);
      ctx.quadraticCurveTo(W / 2, topoBloco - curva, W, topoBloco + curva);
      ctx.lineWidth = 14 * u;
      ctx.strokeStyle = candidato.corSecundaria;
      ctx.stroke();

      const corTexto = corDeTexto(candidato.corPrimaria);
      const nome = candidato.nome.toUpperCase();
      const yNome = H - 280 * u;
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = corTexto;
      ajustarFonte(
        ctx,
        nome,
        (px) => fontDisplay(px, 800),
        80 * u,
        cordaCirculo(W, yNome) - 90 * u
      );
      ctx.fillText(nome, W / 2, yNome);
      ctx.restore();

      const digitos = candidato.numero.replace(/\D/g, "");
      const n = Math.max(digitos.length, 1);
      // Teclas numa faixa mais alta do círculo (corda mais larga = número maior)
      const yTeclas = H - 165 * u;
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

      // Cargo pequeno na base
      const linhaCargo = [candidato.cargo.toUpperCase(), candidato.partido]
        .filter(Boolean)
        .join(" · ");
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = rgba(corTexto, 0.9);
      const yCargo = H - 58 * u;
      ajustarFonte(
        ctx,
        linhaCargo,
        (px) => fontTexto(px, 600),
        27 * u,
        cordaCirculo(W, yCargo) - 50 * u
      );
      ctx.fillText(linhaCargo, W / 2, yCargo);
      ctx.restore();

      if (candidato.logo) {
        drawLogo(ctx, candidato.logo, W / 2, 60 * u, 100 * u, "center");
      }
      return;
    }

    const corteEsq = H - (formato === "feed" ? 330 : 470) * u;
    const queda = 170 * u;
    const corteDir = corteEsq - queda;

    drawFotoCover(ctx, foto, 0, 0, W, H);

    // Bloco de cor abaixo do corte
    ctx.beginPath();
    ctx.moveTo(0, corteEsq);
    ctx.lineTo(W, corteDir);
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fillStyle = candidato.corPrimaria;
    ctx.fill();

    // Faixa de destaque acompanhando a diagonal
    const espessura = 22 * u;
    const folga = 26 * u;
    ctx.beginPath();
    ctx.moveTo(0, corteEsq - folga - espessura);
    ctx.lineTo(W, corteDir - folga - espessura);
    ctx.lineTo(W, corteDir - folga);
    ctx.lineTo(0, corteEsq - folga);
    ctx.closePath();
    ctx.fillStyle = candidato.corSecundaria;
    ctx.fill();

    const corTexto = corDeTexto(candidato.corPrimaria);
    const angulo = Math.atan2(corteDir - corteEsq, W);

    // Número acompanhando a inclinação do corte
    const cy = (corteEsq + corteDir) / 2 + (H - (corteEsq + corteDir) / 2) * 0.36;
    ctx.save();
    ctx.translate(W / 2, cy);
    ctx.rotate(angulo);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = corTexto;
    ajustarFonte(
      ctx,
      candidato.numero,
      (px) => fontDisplay(px, 800),
      (formato === "feed" ? 170 : 200) * u,
      W - 160 * u
    );
    ctx.fillText(candidato.numero, 0, 0);
    ctx.restore();

    // Nome e cargo na base
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    const nome = candidato.nome.toUpperCase();
    ctx.fillStyle = corTexto;
    ajustarFonte(ctx, nome, (px) => fontDisplay(px, 700), 58 * u, W - 140 * u);
    ctx.fillText(nome, W / 2, H - 88 * u);

    const linhaCargo = [candidato.cargo.toUpperCase(), candidato.partido]
      .filter(Boolean)
      .join(" · ");
    ctx.fillStyle = rgba(corTexto, 0.8);
    ajustarFonte(ctx, linhaCargo, (px) => fontTexto(px, 600), 28 * u, W - 140 * u);
    ctx.fillText(linhaCargo, W / 2, H - 36 * u);
    ctx.restore();

    if (candidato.logo) {
      drawLogo(ctx, candidato.logo, 40 * u, 40 * u, 110 * u, "left");
    }
  },
};
