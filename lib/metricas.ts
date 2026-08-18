"use client";

import { supabaseBrowser } from "@/lib/supabase/client";
import type { Formato } from "@/lib/templates/types";

// Registro de métrica fire-and-forget: nunca bloqueia nem quebra a ação
// do apoiador (baixar/compartilhar).
export function registrarGeracao(
  candidatoId: string,
  template: string,
  formato: Formato,
  acao: "download" | "share"
): void {
  try {
    void supabaseBrowser()
      .from("geracoes")
      .insert({ candidato_id: candidatoId, template, formato, acao })
      .then(
        () => {},
        () => {}
      );
  } catch {
    // Métrica nunca derruba a experiência.
  }
}
