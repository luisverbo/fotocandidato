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

// Borda: moldura completa em cor primária com filete de destaque, etiqueta
// com o slogan no topo, número centralizado na base.
export const template: Template = {
  id: "borda",
  nome: "Borda",
  suporta: ["feed", "story", "perfil"],
  draw(ctx, { W, H, u, foto, candidato, formato }) {
    if (formato === "perfil") {
      // Versão circular: a moldura vira um anel na borda do corte redondo.
      drawFotoCover(ctx, foto, 0, 0, W, H);

      const r = W / 2;
      ctx.beginPath();
      ctx.arc(r, r, r - 38 * u, 0, Math.PI * 2);
      ctx.lineWidth = 76 * u;
      ctx.strokeStyle = candidato.corPrimaria;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(r, r, r - 86 * u, 0, Math.PI * 2);
      ctx.lineWidth = 8 * u;
      ctx.strokeStyle = candidato.corSecundaria;
      ctx.stroke();

      // Etiqueta no topo: no perfil o cargo sempre aparece
      const textoEtiqueta = [candidato.cargo, candidato.partido]
        .filter(Boolean)
        .join(" · ")
        .toUpperCase();
      const yEtiqueta = 130 * u;
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ajustarFonte(
        ctx,
        textoEtiqueta,
        (px) => fontTexto(px, 700),
        30 * u,
        cordaCirculo(W, yEtiqueta) - 220 * u
      );
      const larguraTexto = ctx.measureText(textoEtiqueta).width;
      const alturaEtiqueta = 76 * u;
      const larguraEtiqueta = larguraTexto + 84 * u;
      pathRoundRect(
        ctx,
        W / 2 - larguraEtiqueta / 2,
        yEtiqueta - alturaEtiqueta / 2,
        larguraEtiqueta,
        alturaEtiqueta,
        alturaEtiqueta / 2
      );
      ctx.fillStyle = candidato.corSecundaria;
      ctx.fill();
      ctx.fillStyle = corDeTexto(candidato.corSecundaria);
      ctx.fillText(textoEtiqueta, W / 2, yEtiqueta);
      ctx.restore();

      // Placa na base com nome e número
      const corTexto = corDeTexto(candidato.corPrimaria);
      const alturaPlaca = 190 * u;
      const yPlaca = H - 210 * u;
      const larguraPlaca = Math.min(
        620 * u,
        cordaCirculo(W, yPlaca + alturaPlaca / 2) - 40 * u
      );
      ctx.save();
      pathRoundRect(
        ctx,
        W / 2 - larguraPlaca / 2,
        yPlaca - alturaPlaca / 2,
        larguraPlaca,
        alturaPlaca,
        alturaPlaca / 2
      );
      ctx.fillStyle = candidato.corPrimaria;
      ctx.fill();
      ctx.lineWidth = 6 * u;
      ctx.strokeStyle = candidato.corSecundaria;
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const nome = candidato.nome.toUpperCase();
      ctx.fillStyle = corTexto;
      ajustarFonte(
        ctx,
        nome,
        (px) => fontDisplay(px, 700),
        48 * u,
        larguraPlaca - 90 * u
      );
      ctx.fillText(nome, W / 2, yPlaca - 44 * u);
      ajustarFonte(
        ctx,
        candidato.numero,
        (px) => fontDisplay(px, 800),
        98 * u,
        larguraPlaca - 90 * u
      );
      ctx.fillText(candidato.numero, W / 2, yPlaca + 46 * u);
      ctx.restore();

      if (candidato.logo) {
        drawLogo(ctx, candidato.logo, W / 2, 216 * u, 90 * u, "center");
      }
      return;
    }

    const lateral = 56 * u;
    const topo = 56 * u;
    const base = (formato === "feed" ? 300 : 380) * u;

    // Moldura
    ctx.fillStyle = candidato.corPrimaria;
    ctx.fillRect(0, 0, W, H);

    drawFotoCover(ctx, foto, lateral, topo, W - lateral * 2, H - topo - base);

    // Filete de destaque
    ctx.strokeStyle = candidato.corSecundaria;
    ctx.lineWidth = 8 * u;
    ctx.strokeRect(
      lateral - 18 * u,
      topo - 18 * u,
      W - (lateral - 18 * u) * 2,
      H - topo - base + 36 * u
    );

    // Etiqueta no topo (slogan; sem slogan, cargo)
    const textoEtiqueta = (candidato.slogan || candidato.cargo).toUpperCase();
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ajustarFonte(
      ctx,
      textoEtiqueta,
      (px) => fontTexto(px, 700),
      34 * u,
      W - 320 * u
    );
    const larguraTexto = ctx.measureText(textoEtiqueta).width;
    const alturaEtiqueta = 84 * u;
    const larguraEtiqueta = larguraTexto + 96 * u;
    pathRoundRect(
      ctx,
      W / 2 - larguraEtiqueta / 2,
      topo - alturaEtiqueta / 2 + 18 * u,
      larguraEtiqueta,
      alturaEtiqueta,
      alturaEtiqueta / 2
    );
    ctx.fillStyle = candidato.corSecundaria;
    ctx.fill();
    ctx.fillStyle = corDeTexto(candidato.corSecundaria);
    ctx.fillText(textoEtiqueta, W / 2, topo + 18 * u);
    ctx.restore();

    // Base: nome e número centralizados
    const corTexto = corDeTexto(candidato.corPrimaria);
    const centroBase = H - base / 2;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const nome = candidato.nome.toUpperCase();
    ctx.fillStyle = corTexto;
    ajustarFonte(ctx, nome, (px) => fontDisplay(px, 700), 64 * u, W - 200 * u);
    ctx.fillText(nome, W / 2, centroBase - base * 0.26);

    ajustarFonte(
      ctx,
      candidato.numero,
      (px) => fontDisplay(px, 800),
      base * 0.5,
      W - 200 * u
    );
    ctx.fillText(candidato.numero, W / 2, centroBase + base * 0.14);

    const linhaCargo = [candidato.cargo.toUpperCase(), candidato.partido]
      .filter(Boolean)
      .join(" · ");
    ctx.fillStyle = rgba(corTexto, 0.8);
    ajustarFonte(ctx, linhaCargo, (px) => fontTexto(px, 600), 28 * u, W - 200 * u);
    ctx.fillText(linhaCargo, W / 2, H - 44 * u);
    ctx.restore();

    if (candidato.logo) {
      drawLogo(
        ctx,
        candidato.logo,
        W - lateral - 20 * u,
        topo + 20 * u,
        100 * u,
        "right"
      );
    }
  },
};
