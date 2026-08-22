"use client";

// Reduz a imagem antes de enviar ao Storage: arquivos grandes (artes de
// campanha em alta) estouram o limite do bucket e o upload falha.
const LADO_MAXIMO = 1600;

export async function prepararImagemUpload(
  file: File,
  ladoMaximo = LADO_MAXIMO
): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
    const maior = Math.max(bitmap.width, bitmap.height);
    // Arquivo pequeno e leve: envia como está.
    if (maior <= ladoMaximo && file.size <= 1_500_000) return file;

    const fator = Math.min(1, ladoMaximo / maior);
    const w = Math.round(bitmap.width * fator);
    const h = Math.round(bitmap.height * fator);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, w, h);

    // PNG/WebP mantêm transparência; o resto vira JPEG.
    const manterAlfa = file.type === "image/png" || file.type === "image/webp";
    const tipo = manterAlfa ? "image/png" : "image/jpeg";

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, tipo, manterAlfa ? undefined : 0.9)
    );
    if (!blob || blob.size >= file.size) return file;

    const nome = file.name.replace(/\.[^.]+$/, "") + (manterAlfa ? ".png" : ".jpg");
    return new File([blob], nome, { type: tipo });
  } catch {
    return file;
  }
}
