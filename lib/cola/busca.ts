"use client";

import { supabaseBrowser } from "@/lib/supabase/client";
import { ANO_ELEICAO, type CargoCola } from "./cargos";

export interface CandidatoCola {
  id: string;
  numero: string;
  nome_urna: string;
  nome_completo: string | null;
  partido: string | null;
  foto_url: string | null;
  cargo: CargoCola;
  uf: string;
}

// Busca candidatos pelo começo do número (o apoiador vai digitando).
export async function buscarCandidatos(
  uf: string,
  cargo: CargoCola,
  numeroParcial: string
): Promise<CandidatoCola[]> {
  const numero = numeroParcial.replace(/\D/g, "");
  if (numero.length < 2) return [];

  const abrangencia = cargo === "presidente" ? "BR" : uf;

  const { data } = await supabaseBrowser()
    .from("tse_candidatos")
    .select("id, numero, nome_urna, nome_completo, partido, foto_url, cargo, uf")
    .eq("ano", ANO_ELEICAO)
    .eq("uf", abrangencia)
    .eq("cargo", cargo)
    .like("numero", `${numero}%`)
    .order("numero")
    .limit(12);

  return (data ?? []) as CandidatoCola[];
}

// Quantos candidatos existem no banco para a UF — serve para avisar
// quando os dados daquele estado ainda não foram importados.
export async function contarCandidatos(uf: string): Promise<number> {
  const { count } = await supabaseBrowser()
    .from("tse_candidatos")
    .select("id", { count: "exact", head: true })
    .eq("ano", ANO_ELEICAO)
    .eq("uf", uf);
  return count ?? 0;
}
