import type {
  CandidatoArte,
  Formato,
  FotoPosicionada,
  Template,
} from "@/lib/templates/types";
import type { Candidato } from "@/lib/types";

export const DIMENSOES: Record<Formato, { W: number; H: number }> = {
  feed: { W: 1080, H: 1080 },
  story: { W: 1080, H: 1920 },
};

export function candidatoParaArte(
  c: Pick<
    Candidato,
    | "nome"
    | "numero"
    | "cargo"
    | "partido"
    | "slogan"
    | "cor_primaria"
    | "cor_secundaria"
  >,
  logo?: CanvasImageSource | null
): CandidatoArte {
  return {
    nome: c.nome,
    numero: c.numero,
    cargo: c.cargo,
    partido: c.partido,
    slogan: c.slogan,
    corPrimaria: c.cor_primaria,
    corSecundaria: c.cor_secundaria,
    logo,
  };
}

// Renderiza a arte em resolução real (1080×1080 ou 1080×1920).
export function renderizarArte(
  canvas: HTMLCanvasElement,
  template: Template,
  foto: FotoPosicionada,
  candidato: CandidatoArte,
  formato: Formato
): void {
  const { W, H } = DIMENSOES[formato];
  if (canvas.width !== W) canvas.width = W;
  if (canvas.height !== H) canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.imageSmoothingQuality = "high";
  template.draw(ctx, { W, H, u: W / 1080, foto, candidato, formato });
}

// Renderiza uma miniatura: mesmo desenho, canvas pequeno com ctx escalado.
export function renderizarMiniatura(
  canvas: HTMLCanvasElement,
  template: Template,
  foto: FotoPosicionada,
  candidato: CandidatoArte,
  formato: Formato,
  larguraPx: number
): void {
  const { W, H } = DIMENSOES[formato];
  const escala = larguraPx / W;
  const w = Math.round(W * escala);
  const h = Math.round(H * escala);
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(escala, 0, 0, escala, 0, 0);
  ctx.clearRect(0, 0, W, H);
  template.draw(ctx, { W, H, u: W / 1080, foto, candidato, formato });
}

export function canvasParaBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Falha ao gerar imagem"));
      },
      "image/jpeg",
      0.92
    );
  });
}
