import type { Template } from "./types";
import {
  ajustarFonte,
  corDeTexto,
  cordaCirculo,
  drawFotoCover,
  drawLogo,
  fontDisplay,
  fontTexto,
  pathRoundRect,
  rgba,
} from "./helpers";

// Selo: foto em tela cheia, gradiente na base, selo circular com "VOTE"
// e o número grande.
export const template: Template = {
  id: "selo",
  nome: "Selo",
  suporta: ["feed", "story", "perfil"],
  draw(ctx, { W, H, u, foto, candidato, formato }) {
    if (formato === "perfil") {
      // Versão circular: nada na frente do rosto — gradiente na base,
      // nome grande, "VOTE" e o número numa pill de destaque.
      drawFotoCover(ctx, foto, 0, 0, W, H);

      const alturaGrad = 680 * u;
      const grad = ctx.createLinearGradient(0, H - alturaGrad, 0, H);
      grad.addColorStop(0, rgba(candidato.corPrimaria, 0));
      grad.addColorStop(0.5, rgba(candidato.corPrimaria, 0.78));
      grad.addColorStop(1, rgba(candidato.corPrimaria, 0.97));
      ctx.fillStyle = grad;
      ctx.fillRect(0, H - alturaGrad, W, alturaGrad);

      const corTexto = corDeTexto(candidato.corPrimaria);
      const cx = W / 2;

      const nome = candidato.nome.toUpperCase();
      const yNome = H - 330 * u;
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Cargo pequeno acima do nome
      const linhaCargo = [candidato.cargo.toUpperCase(), candidato.partido]
        .filter(Boolean)
        .join(" · ");
      ctx.fillStyle = rgba(corTexto, 0.9);
      ajustarFonte(
        ctx,
        linhaCargo,
        (px) => fontTexto(px, 600),
        28 * u,
        cordaCirculo(W, H - 400 * u) - 120 * u
      );
      ctx.fillText(linhaCargo, cx, H - 400 * u);

      ctx.fillStyle = corTexto;
      ajustarFonte(
        ctx,
        nome,
        (px) => fontDisplay(px, 800),
        84 * u,
        cordaCirculo(W, yNome) - 120 * u
      );
      ctx.fillText(nome, cx, yNome);

      ctx.fillStyle = rgba(corTexto, 0.85);
      ctx.font = fontTexto(38 * u, 700);
      ctx.fillText("VOTE", cx, H - 250 * u);

      // Pill com o número
      ajustarFonte(
        ctx,
        candidato.numero,
        (px) => fontDisplay(px, 800),
        120 * u,
        360 * u
      );
      const larguraNumero = ctx.measureText(candidato.numero).width;
      const alturaPill = 160 * u;
      const larguraPill = larguraNumero + 130 * u;
      const yPill = H - 150 * u;
      pathRoundRect(
        ctx,
        cx - larguraPill / 2,
        yPill - alturaPill / 2,
        larguraPill,
        alturaPill,
        alturaPill / 2
      );
      ctx.fillStyle = candidato.corSecundaria;
      ctx.fill();
      ctx.fillStyle = corDeTexto(candidato.corSecundaria);
      ctx.fillText(candidato.numero, cx, yPill + 6 * u);
      ctx.restore();

      if (candidato.logo) {
        drawLogo(ctx, candidato.logo, W / 2, 60 * u, 100 * u, "center");
      }
      return;
    }

    drawFotoCover(ctx, foto, 0, 0, W, H);

    const alturaGrad = (formato === "feed" ? 620 : 760) * u;
    const grad = ctx.createLinearGradient(0, H - alturaGrad, 0, H);
    grad.addColorStop(0, rgba(candidato.corPrimaria, 0));
    grad.addColorStop(0.55, rgba(candidato.corPrimaria, 0.72));
    grad.addColorStop(1, rgba(candidato.corPrimaria, 0.96));
    ctx.fillStyle = grad;
    ctx.fillRect(0, H - alturaGrad, W, alturaGrad);

    const corTexto = corDeTexto(candidato.corPrimaria);
    const margem = 52 * u;
    const raio = (formato === "feed" ? 175 : 195) * u;
    const cx = W - margem - raio;
    const cy = H - margem - raio - (formato === "story" ? 120 * u : 0);

    // Selo circular
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, raio, 0, Math.PI * 2);
    ctx.fillStyle = candidato.corSecundaria;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, raio - 12 * u, 0, Math.PI * 2);
    ctx.lineWidth = 5 * u;
    ctx.strokeStyle = rgba(corDeTexto(candidato.corSecundaria), 0.55);
    ctx.stroke();

    const corSelo = corDeTexto(candidato.corSecundaria);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = corSelo;
    ctx.font = fontTexto(46 * u, 700);
    ctx.fillText("VOTE", cx, cy - raio * 0.42);
    ajustarFonte(
      ctx,
      candidato.numero,
      (px) => fontDisplay(px, 800),
      raio * 0.85,
      raio * 1.5
    );
    ctx.fillText(candidato.numero, cx, cy + raio * 0.18);
    ctx.restore();

    // Nome e cargo à esquerda, sobre o gradiente
    const maxNome = W - raio * 2 - margem * 3;
    const nome = candidato.nome.toUpperCase();
    ctx.save();
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = corTexto;
    const baseTexto = formato === "story" ? H - 220 * u : H - 150 * u;
    ajustarFonte(ctx, nome, (px) => fontDisplay(px, 800), 96 * u, maxNome);
    ctx.fillText(nome, margem, baseTexto);

    const linhaCargo = [candidato.cargo.toUpperCase(), candidato.partido]
      .filter(Boolean)
      .join(" · ");
    ctx.fillStyle = rgba(corTexto, 0.9);
    ajustarFonte(ctx, linhaCargo, (px) => fontTexto(px, 600), 34 * u, maxNome);
    ctx.fillText(linhaCargo, margem, baseTexto + 52 * u);

    if (candidato.slogan) {
      ctx.fillStyle = rgba(corTexto, 0.8);
      ajustarFonte(
        ctx,
        `“${candidato.slogan}”`,
        (px) => fontTexto(px, 500),
        30 * u,
        maxNome
      );
      ctx.fillText(`“${candidato.slogan}”`, margem, baseTexto + 104 * u);
    }
    ctx.restore();

    if (candidato.logo) {
      drawLogo(ctx, candidato.logo, W - 40 * u, 40 * u, 110 * u, "right");
    }
  },
};
