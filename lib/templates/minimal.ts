import type { Template } from "./types";
import {
  ajustarFonte,
  corDeTexto,
  drawFotoCover,
  drawLogo,
  fontDisplay,
  fontTexto,
  pathRoundRect,
  rgba,
} from "./helpers";

// Minimal: só um badge compacto num canto com número e nome, ocupando o
// mínimo da foto (para quem não quer cobrir o rosto).
export const template: Template = {
  id: "minimal",
  nome: "Minimal",
  suporta: ["feed", "story", "perfil"],
  draw(ctx, { W, H, u, foto, candidato, formato }) {
    if (formato === "perfil") {
      // Versão circular: badge maior, centralizado na base do círculo.
      drawFotoCover(ctx, foto, 0, 0, W, H);

      const alturaBadge = 165 * u;
      const respiro = 32 * u;
      const nome = candidato.nome.toUpperCase();
      const linhaCargo = candidato.cargo.toUpperCase();
      ctx.font = fontTexto(44 * u, 700);
      const larguraNome = Math.min(ctx.measureText(nome).width, 340 * u);
      ctx.font = fontTexto(28 * u, 500);
      const larguraCargo = Math.min(ctx.measureText(linhaCargo).width, 340 * u);
      const larguraTexto = Math.max(larguraNome, larguraCargo);

      const ladoNumero = alturaBadge;
      const larguraBadge = ladoNumero + respiro + larguraTexto + respiro;
      const x = W / 2 - larguraBadge / 2;
      const y = 828 * u;

      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
      ctx.shadowBlur = 24 * u;
      ctx.shadowOffsetY = 8 * u;
      pathRoundRect(ctx, x, y, larguraBadge, alturaBadge, 30 * u);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.restore();

      ctx.save();
      pathRoundRect(ctx, x, y, ladoNumero, alturaBadge, 30 * u);
      ctx.clip();
      ctx.fillStyle = candidato.corPrimaria;
      ctx.fillRect(x, y, ladoNumero, alturaBadge);
      ctx.fillStyle = candidato.corSecundaria;
      ctx.fillRect(x + ladoNumero - 8 * u, y, 8 * u, alturaBadge);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = corDeTexto(candidato.corPrimaria);
      ajustarFonte(
        ctx,
        candidato.numero,
        (px) => fontDisplay(px, 800),
        alturaBadge * 0.56,
        ladoNumero - 22 * u
      );
      ctx.fillText(candidato.numero, x + ladoNumero / 2, y + alturaBadge / 2);
      ctx.restore();

      ctx.save();
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#161616";
      ajustarFonte(ctx, nome, (px) => fontTexto(px, 700), 44 * u, larguraTexto);
      ctx.fillText(nome, x + ladoNumero + respiro, y + alturaBadge * 0.36);
      ctx.fillStyle = rgba("#161616", 0.65);
      ajustarFonte(
        ctx,
        linhaCargo,
        (px) => fontTexto(px, 500),
        28 * u,
        larguraTexto
      );
      ctx.fillText(linhaCargo, x + ladoNumero + respiro, y + alturaBadge * 0.7);
      ctx.restore();

      if (candidato.logo) {
        drawLogo(ctx, candidato.logo, W / 2, 60 * u, 90 * u, "center");
      }
      return;
    }

    drawFotoCover(ctx, foto, 0, 0, W, H);

    const margem = 44 * u;
    const alturaBadge = 132 * u;
    const respiro = 30 * u;

    // Mede o texto para dimensionar o badge
    const nome = candidato.nome.toUpperCase();
    const linhaCargo = candidato.cargo.toUpperCase();
    ctx.font = fontTexto(34 * u, 700);
    const larguraNome = Math.min(ctx.measureText(nome).width, 460 * u);
    ctx.font = fontTexto(24 * u, 500);
    const larguraCargo = Math.min(ctx.measureText(linhaCargo).width, 460 * u);
    const larguraTexto = Math.max(larguraNome, larguraCargo);

    const ladoNumero = alturaBadge;
    const larguraBadge = ladoNumero + respiro + larguraTexto + respiro;
    const x = margem;
    const y = H - margem - alturaBadge - (formato === "story" ? 120 * u : 0);

    // Corpo do badge
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
    ctx.shadowBlur = 24 * u;
    ctx.shadowOffsetY = 8 * u;
    pathRoundRect(ctx, x, y, larguraBadge, alturaBadge, 24 * u);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();

    // Bloco do número na cor primária
    ctx.save();
    pathRoundRect(ctx, x, y, ladoNumero, alturaBadge, 24 * u);
    ctx.clip();
    ctx.fillStyle = candidato.corPrimaria;
    ctx.fillRect(x, y, ladoNumero, alturaBadge);
    ctx.fillStyle = candidato.corSecundaria;
    ctx.fillRect(x + ladoNumero - 8 * u, y, 8 * u, alturaBadge);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = corDeTexto(candidato.corPrimaria);
    ajustarFonte(
      ctx,
      candidato.numero,
      (px) => fontDisplay(px, 800),
      alturaBadge * 0.56,
      ladoNumero - 24 * u
    );
    ctx.fillText(candidato.numero, x + ladoNumero / 2, y + alturaBadge / 2);
    ctx.restore();

    // Nome e cargo
    ctx.save();
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#161616";
    ajustarFonte(ctx, nome, (px) => fontTexto(px, 700), 34 * u, larguraTexto);
    ctx.fillText(nome, x + ladoNumero + respiro, y + alturaBadge * 0.36);
    ctx.fillStyle = rgba("#161616", 0.65);
    ajustarFonte(ctx, linhaCargo, (px) => fontTexto(px, 500), 24 * u, larguraTexto);
    ctx.fillText(linhaCargo, x + ladoNumero + respiro, y + alturaBadge * 0.7);
    ctx.restore();

    if (candidato.logo) {
      drawLogo(ctx, candidato.logo, W - 40 * u, 40 * u, 96 * u, "right");
    }
  },
};
