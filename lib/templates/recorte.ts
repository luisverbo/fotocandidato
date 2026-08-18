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

function pathHexagono(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  raio: number
): void {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const ang = Math.PI / 2 + (i * Math.PI) / 3;
    const x = cx + raio * Math.cos(ang);
    const y = cy + raio * Math.sin(ang);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

// Recorte: foto dentro de um círculo (feed) ou hexágono (story) centralizado
// sobre fundo em cor sólida, nome acima e número abaixo.
export const template: Template = {
  id: "recorte",
  nome: "Recorte",
  suporta: ["feed", "story", "perfil"],
  draw(ctx, { W, H, u, foto, candidato, formato }) {
    if (formato === "perfil") {
      // Versão circular: círculo de foto menor, nome no topo e teclas na
      // base, tudo dentro da área segura do corte redondo.
      ctx.fillStyle = candidato.corPrimaria;
      ctx.fillRect(0, 0, W, H);

      const raio = 300 * u;
      const cx = W / 2;
      const cy = 530 * u;

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, raio, 0, Math.PI * 2);
      ctx.clip();
      drawFotoCover(ctx, foto, cx - raio, cy - raio, raio * 2, raio * 2);
      ctx.restore();

      ctx.beginPath();
      ctx.arc(cx, cy, raio, 0, Math.PI * 2);
      ctx.lineWidth = 14 * u;
      ctx.strokeStyle = candidato.corSecundaria;
      ctx.stroke();

      const corTexto = corDeTexto(candidato.corPrimaria);
      const nome = candidato.nome.toUpperCase();
      const yNome = 150 * u;
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = corTexto;
      ajustarFonte(
        ctx,
        nome,
        (px) => fontDisplay(px, 800),
        72 * u,
        cordaCirculo(W, yNome) - 80 * u
      );
      ctx.fillText(nome, cx, yNome);
      ctx.restore();

      const digitos = candidato.numero.replace(/\D/g, "");
      const n = Math.max(digitos.length, 1);
      const yTeclas = 935 * u;
      const tecla = Math.min(
        80 * u,
        (cordaCirculo(W, yTeclas + 40 * u) - 60 * u) / (n + (n - 1) * 0.12)
      );
      drawTeclasUrna(
        ctx,
        candidato.numero,
        cx,
        yTeclas,
        tecla,
        candidato.corSecundaria,
        corDeTexto(candidato.corSecundaria)
      );
      return;
    }

    ctx.fillStyle = candidato.corPrimaria;
    ctx.fillRect(0, 0, W, H);

    const raio = (formato === "feed" ? 330 : 400) * u;
    const cx = W / 2;
    const cy = formato === "feed" ? H * 0.47 : H * 0.44;

    const pathRecorte = () => {
      if (formato === "feed") {
        ctx.beginPath();
        ctx.arc(cx, cy, raio, 0, Math.PI * 2);
      } else {
        pathHexagono(ctx, cx, cy, raio);
      }
    };

    // Foto recortada na forma
    ctx.save();
    pathRecorte();
    ctx.clip();
    drawFotoCover(ctx, foto, cx - raio, cy - raio, raio * 2, raio * 2);
    ctx.restore();

    // Anel de destaque
    pathRecorte();
    ctx.lineWidth = 14 * u;
    ctx.strokeStyle = candidato.corSecundaria;
    ctx.stroke();

    const corTexto = corDeTexto(candidato.corPrimaria);

    // Nome e cargo acima
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const nome = candidato.nome.toUpperCase();
    ctx.fillStyle = corTexto;
    const topoTexto = cy - raio;
    ajustarFonte(ctx, nome, (px) => fontDisplay(px, 800), 92 * u, W - 140 * u);
    ctx.fillText(nome, cx, topoTexto - 130 * u);

    const linhaCargo = [candidato.cargo.toUpperCase(), candidato.partido]
      .filter(Boolean)
      .join(" · ");
    ctx.fillStyle = rgba(corTexto, 0.85);
    ajustarFonte(ctx, linhaCargo, (px) => fontTexto(px, 600), 32 * u, W - 140 * u);
    ctx.fillText(linhaCargo, cx, topoTexto - 58 * u);
    ctx.restore();

    // Número abaixo, em teclas de urna
    const digitos = candidato.numero.replace(/\D/g, "");
    const tecla = Math.min(112 * u, (W - 200 * u) / Math.max(digitos.length, 1) / 1.12);
    const yTeclas = cy + raio + 130 * u;
    drawTeclasUrna(
      ctx,
      candidato.numero,
      cx,
      yTeclas,
      tecla,
      candidato.corSecundaria,
      corDeTexto(candidato.corSecundaria)
    );

    if (candidato.slogan) {
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = rgba(corTexto, 0.85);
      ajustarFonte(
        ctx,
        `“${candidato.slogan}”`,
        (px) => fontTexto(px, 500),
        30 * u,
        W - 180 * u
      );
      ctx.fillText(`“${candidato.slogan}”`, cx, yTeclas + tecla / 2 + 76 * u);
      ctx.restore();
    }

    if (candidato.logo) {
      drawLogo(ctx, candidato.logo, cx, H - 150 * u, 100 * u, "center");
    }
  },
};
