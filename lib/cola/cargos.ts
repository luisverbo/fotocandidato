// Cargos da Cola Digital, na ordem em que aparecem na urna eletrônica.
export type CargoCola =
  | "deputado_estadual"
  | "deputado_distrital"
  | "deputado_federal"
  | "senador"
  | "governador"
  | "presidente";

export interface DefinicaoCargo {
  id: CargoCola;
  nome: string;
  digitos: number;
  // Quantos candidatos a pessoa vota neste cargo (senador pode ser 2)
  vagas: number;
  // Cargo nacional: o candidato não muda de estado para estado
  nacional?: boolean;
}

// Em 2026 são eleitos dois senadores por estado.
export const CARGOS: DefinicaoCargo[] = [
  { id: "deputado_estadual", nome: "Deputado Estadual", digitos: 5, vagas: 1 },
  { id: "deputado_federal", nome: "Deputado Federal", digitos: 4, vagas: 1 },
  { id: "senador", nome: "Senador", digitos: 3, vagas: 2 },
  { id: "governador", nome: "Governador", digitos: 2, vagas: 1 },
  { id: "presidente", nome: "Presidente", digitos: 2, vagas: 1, nacional: true },
];

// No Distrito Federal não há deputado estadual nem governador de estado:
// são deputados distritais e governador do DF.
export function cargosDaUf(uf: string): DefinicaoCargo[] {
  if (uf === "DF") {
    return CARGOS.map((c) =>
      c.id === "deputado_estadual"
        ? { ...c, id: "deputado_distrital" as CargoCola, nome: "Deputado Distrital" }
        : c
    );
  }
  return CARGOS;
}

export const UFS: { sigla: string; nome: string }[] = [
  { sigla: "AC", nome: "Acre" },
  { sigla: "AL", nome: "Alagoas" },
  { sigla: "AP", nome: "Amapá" },
  { sigla: "AM", nome: "Amazonas" },
  { sigla: "BA", nome: "Bahia" },
  { sigla: "CE", nome: "Ceará" },
  { sigla: "DF", nome: "Distrito Federal" },
  { sigla: "ES", nome: "Espírito Santo" },
  { sigla: "GO", nome: "Goiás" },
  { sigla: "MA", nome: "Maranhão" },
  { sigla: "MT", nome: "Mato Grosso" },
  { sigla: "MS", nome: "Mato Grosso do Sul" },
  { sigla: "MG", nome: "Minas Gerais" },
  { sigla: "PA", nome: "Pará" },
  { sigla: "PB", nome: "Paraíba" },
  { sigla: "PR", nome: "Paraná" },
  { sigla: "PE", nome: "Pernambuco" },
  { sigla: "PI", nome: "Piauí" },
  { sigla: "RJ", nome: "Rio de Janeiro" },
  { sigla: "RN", nome: "Rio Grande do Norte" },
  { sigla: "RS", nome: "Rio Grande do Sul" },
  { sigla: "RO", nome: "Rondônia" },
  { sigla: "RR", nome: "Roraima" },
  { sigla: "SC", nome: "Santa Catarina" },
  { sigla: "SP", nome: "São Paulo" },
  { sigla: "SE", nome: "Sergipe" },
  { sigla: "TO", nome: "Tocantins" },
];

export const ANO_ELEICAO = 2026;
