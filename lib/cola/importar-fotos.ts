"use client";

// Importação das fotos oficiais dos candidatos (arquivo foto_cand do TSE).
// Os arquivos vêm nomeados com o SQ_CANDIDATO — o mesmo código que já
// gravamos na importação do CSV —, então o casamento é automático.

// Extrai o SQ_CANDIDATO do nome do arquivo (ex.: FBA250001234567_div.jpg)
export function sqDoNomeDoArquivo(nome: string): string | null {
  const base = nome.split("/").pop() ?? nome;
  const digitos = base.match(/\d{6,}/g);
  if (!digitos || digitos.length === 0) return null;
  // O maior bloco de dígitos é o código do candidato
  return digitos.sort((a, b) => b.length - a.length)[0];
}

// Reduz a foto antes de subir: o arquivo original do TSE é grande demais
// para guardar milhares deles no Storage.
export async function comprimirFoto(
  bytes: Uint8Array,
  ladoMaximo = 260
): Promise<Blob | null> {
  try {
    const copia = new Uint8Array(bytes);
    const blobOriginal = new Blob([copia], { type: "image/jpeg" });
    const bitmap = await createImageBitmap(blobOriginal);

    const fator = Math.min(1, ladoMaximo / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * fator));
    const h = Math.max(1, Math.round(bitmap.height * fator));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.75)
    );
  } catch {
    return null;
  }
}

// Descompacta o zip de fotos sem travar a interface.
export async function abrirZipDeFotos(
  origem: File | Uint8Array
): Promise<Record<string, Uint8Array>> {
  const buffer =
    origem instanceof Uint8Array
      ? origem
      : new Uint8Array(await origem.arrayBuffer());
  const { unzip } = await import("fflate");

  return new Promise((resolve, reject) => {
    unzip(buffer, (erro, arquivos) => {
      if (erro) {
        reject(new Error("Não foi possível abrir o zip de fotos."));
        return;
      }
      const imagens: Record<string, Uint8Array> = {};
      for (const [nome, dados] of Object.entries(arquivos)) {
        if (/\.(jpe?g|png)$/i.test(nome) && dados.length > 0) {
          imagens[nome] = dados;
        }
      }
      resolve(imagens);
    });
  });
}

// Executa as tarefas com um limite de paralelismo, para não abrir
// centenas de uploads ao mesmo tempo.
export async function emLotes<T>(
  itens: T[],
  paralelismo: number,
  tarefa: (item: T) => Promise<void>,
  aoProgredir?: (feitos: number) => void
): Promise<void> {
  let indice = 0;
  let feitos = 0;

  async function trabalhador() {
    while (indice < itens.length) {
      const meu = indice++;
      await tarefa(itens[meu]);
      feitos++;
      aoProgredir?.(feitos);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(paralelismo, itens.length) }, trabalhador)
  );
}

// Endereços oficiais dos arquivos de foto no CDN do TSE.
export function urlFotosTse(ano: number | string, uf: string): string {
  return `https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes${ano}/candidatos/foto_cand${ano}_${uf.toUpperCase()}_div.zip`;
}
