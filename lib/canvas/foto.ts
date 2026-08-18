// Carregamento da foto do apoiador, 100% no client.
// - Corrige orientação EXIF (fotos de iPhone na vertical).
// - Reduz imagens grandes antes do canvas para não travar celular fraco.

export class ErroFoto extends Error {
  constructor(public codigo: "nao-imagem" | "corrompida") {
    super(codigo);
  }
}

export interface FotoCarregada {
  img: CanvasImageSource;
  largura: number;
  altura: number;
}

const LADO_MAXIMO = 2200;

function carregarViaElemento(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ErroFoto("corrompida"));
    };
    img.src = url;
  });
}

function reduzir(origem: CanvasImageSource, w: number, h: number): FotoCarregada {
  const maior = Math.max(w, h);
  if (maior <= LADO_MAXIMO) {
    return { img: origem, largura: w, altura: h };
  }
  const fator = LADO_MAXIMO / maior;
  const nw = Math.round(w * fator);
  const nh = Math.round(h * fator);
  const canvas = document.createElement("canvas");
  canvas.width = nw;
  canvas.height = nh;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(origem, 0, 0, nw, nh);
  return { img: canvas, largura: nw, altura: nh };
}

export async function carregarFoto(file: File): Promise<FotoCarregada> {
  if (!file.type.startsWith("image/")) {
    throw new ErroFoto("nao-imagem");
  }

  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
      if (bitmap.width > 0 && bitmap.height > 0) {
        return reduzir(bitmap, bitmap.width, bitmap.height);
      }
    } catch {
      // Alguns navegadores antigos não aceitam as opções — cai no fallback.
    }
  }

  const img = await carregarViaElemento(file);
  if (!img.naturalWidth || !img.naturalHeight) {
    throw new ErroFoto("corrompida");
  }
  return reduzir(img, img.naturalWidth, img.naturalHeight);
}

// Carrega imagem externa (logo no Storage) pronta para uso em canvas.
export function carregarImagemUrl(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
