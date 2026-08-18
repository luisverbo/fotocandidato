"use client";

import { useState } from "react";
import QRCode from "qrcode";

// Gera QR Code do link público, para imprimir em panfleto ou ponto físico.
export default function QrCodeLink({
  url,
  slug,
}: {
  url: string;
  slug: string;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);

  async function abrir() {
    if (!dataUrl) {
      const gerado = await QRCode.toDataURL(url, {
        width: 640,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
      setDataUrl(gerado);
    }
    setAberto(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className="rounded-md border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-800"
      >
        QR Code
      </button>

      {aberto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="QR Code do link do candidato"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={() => setAberto(false)}
        >
          <div
            className="w-full max-w-xs rounded-xl bg-white p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {dataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={dataUrl}
                alt={`QR Code do link ${url}`}
                className="mx-auto w-full"
              />
            )}
            <p className="mt-2 break-all text-xs text-neutral-500">{url}</p>
            <div className="mt-4 grid gap-2">
              {dataUrl && (
                <a
                  href={dataUrl}
                  download={`qrcode-${slug}.png`}
                  className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  Baixar PNG
                </a>
              )}
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
