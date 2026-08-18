import type { Template } from "./types";
import {
  ajustarFonte,
  corDeTexto,
  cordaCirculo,
  drawFotoCover,
  drawLogo,
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
      // Versão circular: corte um pouco mais alto e textos centralizados
      // dentro da área segura do corte redondo.
      const corteEsq = H - 370 * u;
      const queda = 150 * u;
      const corteDir = corteEsq - queda;

      drawFotoCover(ctx, foto, 0, 0, W, H);

      ctx.beginPath();
      ctx.moveTo(0, corteEsq);
      ctx.lineTo(W, corteDir);
      ctx.lineTo(W, H);
      ctx.lineTo(0, H);
      ctx.closePath();
      ctx.fillStyle = candidato.corPrimaria;
      ctx.fill();

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
      const meio = (corteEsq + corteDir) / 2;
      const cy = meio + (H - meio) * 0.34;

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
        150 * u,
        cordaCirculo(W, cy) - 140 * u
      );
      ctx.fillText(candidato.numero, 0, 0);
      ctx.restore();

      const nome = candidato.nome.toUpperCase();
      const yNome = H - 130 * u;
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = corTexto;
      ajustarFonte(
        ctx,
        nome,
        (px) => fontDisplay(px, 700),
        54 * u,
        cordaCirculo(W, yNome) - 80 * u
      );
      ctx.fillText(nome, W / 2, yNome);
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
