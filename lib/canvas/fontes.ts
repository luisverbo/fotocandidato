// Garante que as fontes da arte estejam prontas antes de qualquer render.
// Sem isso, a primeira renderização sai com a fonte de fallback.
let promessa: Promise<void> | null = null;

export function aguardarFontes(): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  if (!promessa) {
    promessa = (async () => {
      try {
        await Promise.all([
          document.fonts.load('700 32px "Barlow Condensed"'),
          document.fonts.load('800 32px "Barlow Condensed"'),
          document.fonts.load("500 16px Archivo"),
          document.fonts.load("600 16px Archivo"),
          document.fonts.load("700 16px Archivo"),
        ]);
        await document.fonts.ready;
      } catch {
        // Nunca bloqueia o fluxo por causa de fonte.
      }
    })();
  }
  return promessa;
}
