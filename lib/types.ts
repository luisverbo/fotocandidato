export interface Candidato {
  id: string;
  user_id: string;
  slug: string;
  nome: string;
  numero: string;
  cargo: string;
  partido: string | null;
  slogan: string | null;
  cor_primaria: string;
  cor_secundaria: string;
  logo_url: string | null;
  foto_url: string | null;
  templates_ativos: string[];
  formatos_ativos: string[];
  apenas_molduras: boolean;
  ativo: boolean;
  created_at: string;
}

export interface Geracao {
  id: string;
  candidato_id: string;
  template: string;
  formato: "feed" | "story" | "perfil";
  acao: "download" | "share";
  created_at: string;
}

export interface Moldura {
  id: string;
  candidato_id: string;
  nome: string;
  formato: "feed" | "story" | "perfil";
  arquivo_url: string;
  created_at: string;
}
