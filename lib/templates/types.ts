export type Formato = "feed" | "story" | "perfil";

// Ajuste feito pelo apoiador: arrastar (offset em px do canvas) e zoom (1 = cover).
export interface FotoAjuste {
  offsetX: number;
  offsetY: number;
  zoom: number;
}

export interface FotoPosicionada {
  img: CanvasImageSource;
  largura: number;
  altura: number;
  ajuste: FotoAjuste;
}

// Dados do candidato já resolvidos para desenho (logo carregada como imagem).
export interface CandidatoArte {
  nome: string;
  numero: string;
  cargo: string;
  partido?: string | null;
  slogan?: string | null;
  corPrimaria: string;
  corSecundaria: string;
  logo?: CanvasImageSource | null;
}

export interface DrawOptions {
  W: number;
  H: number;
  // Unidade proporcional: u = W / 1080. Nenhum template usa px absoluto.
  u: number;
  foto: FotoPosicionada;
  candidato: CandidatoArte;
  formato: Formato;
}

export interface Template {
  id: string;
  nome: string;
  suporta: Formato[];
  draw(ctx: CanvasRenderingContext2D, opts: DrawOptions): void;
}
