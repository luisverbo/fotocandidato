import type { Metadata } from "next";
import ColaDigital from "@/components/cola/ColaDigital";
import { ANO_ELEICAO } from "@/lib/cola/cargos";

export const metadata: Metadata = {
  title: `Cola Digital — Eleições ${ANO_ELEICAO}`,
  description:
    "Monte sua lista de votos, baixe em PDF e imprima para levar no papel. Não é permitido usar o celular na cabine de votação.",
  openGraph: {
    title: `Cola Digital — Eleições ${ANO_ELEICAO}`,
    description:
      "Monte sua lista de votos, baixe em PDF e imprima para levar no papel.",
    type: "website",
  },
};

export default function PaginaCola() {
  return <ColaDigital />;
}
