import { NextResponse } from "next/server";

export const runtime = "nodejs";

// As fotos do TSE não enviam cabeçalho CORS. Sem este proxy, ao desenhar a
// foto no canvas o navegador marca a imagem como "contaminada" e a geração
// do PNG/PDF falha. Só repassamos imagens de domínios do TSE.
const HOSTS_PERMITIDOS = [
  "divulgacandcontas.tse.jus.br",
  "cdn.tse.jus.br",
  "sig.tse.jus.br",
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const alvo = searchParams.get("url");
  if (!alvo) {
    return NextResponse.json({ erro: "Informe a url." }, { status: 400 });
  }

  let url: URL;
  try {
    url = new URL(alvo);
  } catch {
    return NextResponse.json({ erro: "URL inválida." }, { status: 400 });
  }

  if (
    url.protocol !== "https:" ||
    !HOSTS_PERMITIDOS.some(
      (host) => url.hostname === host || url.hostname.endsWith(`.${host}`)
    )
  ) {
    return NextResponse.json({ erro: "Domínio não permitido." }, { status: 403 });
  }

  try {
    const resposta = await fetch(url.toString(), {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!resposta.ok) {
      return NextResponse.json({ erro: "Foto indisponível." }, { status: 404 });
    }

    const tipo = resposta.headers.get("content-type") ?? "";
    if (!tipo.startsWith("image/")) {
      return NextResponse.json({ erro: "Conteúdo não é imagem." }, { status: 415 });
    }

    return new NextResponse(await resposta.arrayBuffer(), {
      headers: {
        "Content-Type": tipo,
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return NextResponse.json({ erro: "Falha ao buscar a foto." }, { status: 502 });
  }
}
