import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Coloque sua foto na arte da campanha";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface CandidatoOg {
  nome: string;
  numero: string;
  cargo: string;
  partido: string | null;
  cor_primaria: string;
  foto_url: string | null;
  cor_secundaria: string;
}

async function buscarCandidato(slug: string): Promise<CandidatoOg | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(
      `${url}/rest/v1/candidatos?slug=eq.${encodeURIComponent(
        slug
      )}&ativo=eq.true&select=nome,numero,cargo,partido,cor_primaria,cor_secundaria,foto_url&limit=1`,
      {
        headers: { apikey: key, authorization: `Bearer ${key}` },
        next: { revalidate: 300 },
      }
    );
    if (!res.ok) return null;
    const linhas = (await res.json()) as CandidatoOg[];
    return linhas[0] ?? null;
  } catch {
    return null;
  }
}

function corDeTexto(hex: string): string {
  let h = (hex || "").replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  if (Number.isNaN(n) || h.length !== 6) return "#ffffff";
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#111111" : "#ffffff";
}

export default async function Image({
  params,
}: {
  params: { slug: string };
}) {
  const c = await buscarCandidato(params.slug);
  const primaria = c?.cor_primaria ?? "#1e40af";
  const secundaria = c?.cor_secundaria ?? "#fbbf24";
  const texto = corDeTexto(primaria);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: primaria,
          color: texto,
          fontFamily: "sans-serif",
        }}
      >
        {c?.foto_url && (
          // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
          <img
            src={c.foto_url}
            width={180}
            height={180}
            style={{
              borderRadius: 9999,
              objectFit: "cover",
              marginBottom: 24,
              border: "6px solid " + secundaria,
            }}
          />
        )}
        <div
          style={{
            fontSize: 34,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 6,
            opacity: 0.9,
          }}
        >
          {c ? "Coloque sua foto na arte de" : "Santinho Digital"}
        </div>
        <div
          style={{
            fontSize: 92,
            fontWeight: 800,
            textTransform: "uppercase",
            marginTop: 12,
            textAlign: "center",
            maxWidth: 1100,
          }}
        >
          {c ? c.nome : "Sua arte de campanha"}
        </div>
        {c && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              marginTop: 28,
            }}
          >
            <div
              style={{
                backgroundColor: secundaria,
                color: corDeTexto(secundaria),
                fontSize: 72,
                fontWeight: 800,
                padding: "8px 36px",
                borderRadius: 16,
              }}
            >
              {c.numero}
            </div>
            <div style={{ fontSize: 36, fontWeight: 700 }}>
              {c.cargo}
              {c.partido ? ` · ${c.partido}` : ""}
            </div>
          </div>
        )}
      </div>
    ),
    size
  );
}
