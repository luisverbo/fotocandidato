import type { Template } from "./types";
import { template as faixa } from "./faixa";
import { template as selo } from "./selo";
import { template as borda } from "./borda";
import { template as diagonal } from "./diagonal";
import { template as recorte } from "./recorte";
import { template as minimal } from "./minimal";

// Para adicionar um template novo: crie o arquivo em lib/templates/ e
// acrescente uma linha aqui. Nenhum componente de UI precisa mudar.
export const templates: Template[] = [
  faixa,
  selo,
  borda,
  diagonal,
  recorte,
  minimal,
];

export function templatePorId(id: string): Template | undefined {
  return templates.find((t) => t.id === id);
}

export * from "./types";
