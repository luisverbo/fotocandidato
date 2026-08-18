// Gera slug no formato nome-sobrenome-numero, ex: maria-souza-45678
const COMBINANTES = new RegExp("[\\u0300-\\u036f]", "g");

export function gerarSlug(nome: string, numero: string): string {
  const base = nome
    .normalize("NFD")
    .replace(COMBINANTES, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  const num = numero.replace(/\D/g, "");
  return [base, num].filter(Boolean).join("-");
}

// Sufixo curto para resolver colisão de slug.
export function sufixoAleatorio(): string {
  return Math.random().toString(36).slice(2, 6);
}
