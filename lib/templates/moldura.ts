import type { Moldura } from "@/lib/types";
import type { Template } from "./types";
import { drawFotoCover } from "./helpers";

// Transforma uma moldura pronta (arte enviada pelo organizador, PNG com
// área transparente) num template: foto do apoiador atrás, arte na frente.
export function criarTemplateMoldura(
  moldura: Moldura,
  img: CanvasImageSource
): Template {
  return {
    id: `moldura-${moldura.id}`,
    nome: moldura.nome,
    suporta: [moldura.formato],
    draw(ctx, { W, H, foto }) {
      drawFotoCover(ctx, foto, 0, 0, W, H);
      ctx.drawImage(img, 0, 0, W, H);
    },
  };
}
