"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { gerarSlug, sufixoAleatorio } from "@/lib/slug";
import { templates } from "@/lib/templates";
import type { Candidato } from "@/lib/types";
import PreviewArte, { type DadosPreview } from "./PreviewArte";

const CARGOS = [
  "Vereador(a)",
  "Prefeito(a)",
  "Vice-Prefeito(a)",
  "Deputado(a) Estadual",
  "Deputado(a) Federal",
  "Senador(a)",
  "Governador(a)",
];

interface Props {
  inicial?: Candidato;
}

const rotulo = "mb-1 block text-sm font-semibold text-zinc-400";
const campo =
  "h-11 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 text-zinc-100 placeholder:text-zinc-600";

export default function CandidatoForm({ inicial }: Props) {
  const router = useRouter();
  const editando = Boolean(inicial);

  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [numero, setNumero] = useState(inicial?.numero ?? "");
  const [cargo, setCargo] = useState(inicial?.cargo ?? "");
  const [partido, setPartido] = useState(inicial?.partido ?? "");
  const [slogan, setSlogan] = useState(inicial?.slogan ?? "");
  const [corPrimaria, setCorPrimaria] = useState(
    inicial?.cor_primaria ?? "#1e40af"
  );
  const [corSecundaria, setCorSecundaria] = useState(
    inicial?.cor_secundaria ?? "#fbbf24"
  );
  const [templatesAtivos, setTemplatesAtivos] = useState<string[]>(
    inicial?.templates_ativos ?? templates.map((t) => t.id)
  );
  const [ativo, setAtivo] = useState(inicial?.ativo ?? true);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null);
  const [logoRemovida, setLogoRemovida] = useState(false);

  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(
    inicial?.foto_url ?? null
  );
  const [fotoRemovida, setFotoRemovida] = useState(false);

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Carrega a logo (existente ou recém-escolhida) para o preview do canvas.
  useEffect(() => {
    let cancelado = false;

    if (logoFile) {
      const url = URL.createObjectURL(logoFile);
      const img = new Image();
      img.onload = () => {
        if (!cancelado) setLogoImg(img);
      };
      img.src = url;
      return () => {
        cancelado = true;
        URL.revokeObjectURL(url);
      };
    }

    if (inicial?.logo_url && !logoRemovida) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (!cancelado) setLogoImg(img);
      };
      img.onerror = () => {
        if (!cancelado) setLogoImg(null);
      };
      img.src = inicial.logo_url;
    } else {
      setLogoImg(null);
    }
    return () => {
      cancelado = true;
    };
  }, [logoFile, inicial?.logo_url, logoRemovida]);

  function alternarTemplate(id: string) {
    setTemplatesAtivos((atual) =>
      atual.includes(id) ? atual.filter((t) => t !== id) : [...atual, id]
    );
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (templatesAtivos.length === 0) {
      setErro("Deixe pelo menos um modelo disponível para os apoiadores.");
      return;
    }

    setSalvando(true);
    const supabase = supabaseBrowser();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      // Upload da logo, se houver
      let logoUrl: string | null = logoRemovida ? null : (inicial?.logo_url ?? null);
      if (logoFile) {
        const caminho = `${user.id}/${crypto.randomUUID()}.png`;
        const { error: erroUpload } = await supabase.storage
          .from("logos")
          .upload(caminho, logoFile, { contentType: logoFile.type });
        if (erroUpload) {
          setErro("Não foi possível enviar a logo. Tente novamente.");
          return;
        }
        logoUrl = supabase.storage.from("logos").getPublicUrl(caminho).data
          .publicUrl;
      }

      // Upload da foto do candidato, se houver
      let fotoUrl: string | null = fotoRemovida
        ? null
        : (inicial?.foto_url ?? null);
      if (fotoFile) {
        const extensao = fotoFile.type === "image/png" ? "png" : "jpg";
        const caminho = `${user.id}/foto-${crypto.randomUUID()}.${extensao}`;
        const { error: erroUpload } = await supabase.storage
          .from("logos")
          .upload(caminho, fotoFile, { contentType: fotoFile.type });
        if (erroUpload) {
          setErro("Não foi possível enviar a foto do candidato. Tente novamente.");
          return;
        }
        fotoUrl = supabase.storage.from("logos").getPublicUrl(caminho).data
          .publicUrl;
      }

      const dados = {
        nome: nome.trim(),
        numero: numero.trim(),
        cargo: cargo.trim(),
        partido: partido.trim() || null,
        slogan: slogan.trim() || null,
        cor_primaria: corPrimaria,
        cor_secundaria: corSecundaria,
        logo_url: logoUrl,
        foto_url: fotoUrl,
        templates_ativos: templatesAtivos,
        ativo,
      };

      if (editando && inicial) {
        const { error } = await supabase
          .from("candidatos")
          .update(dados)
          .eq("id", inicial.id);
        if (error) {
          setErro("Não foi possível salvar. Tente novamente.");
          return;
        }
      } else {
        let slug = gerarSlug(dados.nome, dados.numero);
        let { error } = await supabase
          .from("candidatos")
          .insert({ ...dados, slug, user_id: user.id });
        if (error?.code === "23505") {
          slug = `${slug}-${sufixoAleatorio()}`;
          ({ error } = await supabase
            .from("candidatos")
            .insert({ ...dados, slug, user_id: user.id }));
        }
        if (error) {
          setErro("Não foi possível cadastrar. Confira os dados e tente de novo.");
          return;
        }
      }

      router.push("/painel");
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  const dadosPreview: DadosPreview = {
    nome,
    numero,
    cargo,
    partido,
    slogan,
    cor_primaria: corPrimaria,
    cor_secundaria: corSecundaria,
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
      <form onSubmit={salvar} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className={rotulo}>Nome do candidato</span>
            <input
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className={campo}
              placeholder="Maria Souza"
            />
          </label>

          <label className="block">
            <span className={rotulo}>Número</span>
            <input
              required
              inputMode="numeric"
              pattern="[0-9]{2,5}"
              title="Somente números (2 a 5 dígitos)"
              value={numero}
              onChange={(e) => setNumero(e.target.value.replace(/\D/g, ""))}
              className={campo}
              placeholder="45678"
            />
          </label>

          <label className="block">
            <span className={rotulo}>Cargo</span>
            <input
              required
              list="lista-cargos"
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              className={campo}
              placeholder="Vereador(a)"
            />
            <datalist id="lista-cargos">
              {CARGOS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>

          <label className="block">
            <span className={rotulo}>Partido (opcional)</span>
            <input
              value={partido}
              onChange={(e) => setPartido(e.target.value)}
              className={campo}
              placeholder="Sigla"
            />
          </label>

          <label className="block">
            <span className={rotulo}>Slogan (opcional)</span>
            <input
              value={slogan}
              onChange={(e) => setSlogan(e.target.value)}
              className={campo}
              placeholder="Por uma cidade melhor"
              maxLength={60}
            />
          </label>

          <label className="block">
            <span className={rotulo}>Cor primária</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={corPrimaria}
                onChange={(e) => setCorPrimaria(e.target.value)}
                className="h-11 w-14 cursor-pointer rounded-md border border-zinc-700 bg-zinc-900 p-1"
                aria-label="Escolher cor primária"
              />
              <input
                value={corPrimaria}
                onChange={(e) => setCorPrimaria(e.target.value)}
                pattern="#[0-9a-fA-F]{6}"
                className={campo}
                aria-label="Código hexadecimal da cor primária"
              />
            </div>
          </label>

          <label className="block">
            <span className={rotulo}>Cor secundária</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={corSecundaria}
                onChange={(e) => setCorSecundaria(e.target.value)}
                className="h-11 w-14 cursor-pointer rounded-md border border-zinc-700 bg-zinc-900 p-1"
                aria-label="Escolher cor secundária"
              />
              <input
                value={corSecundaria}
                onChange={(e) => setCorSecundaria(e.target.value)}
                pattern="#[0-9a-fA-F]{6}"
                className={campo}
                aria-label="Código hexadecimal da cor secundária"
              />
            </div>
          </label>

          <div className="sm:col-span-2">
            <span className={rotulo}>
              Foto do candidato (aparece no topo da página pública, opcional)
            </span>
            <div className="flex flex-wrap items-center gap-3">
              {fotoPreview && !fotoRemovida && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fotoPreview}
                  alt="Prévia da foto do candidato"
                  className="h-14 w-14 rounded-full border border-zinc-700 object-cover"
                />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const arquivo = e.target.files?.[0] ?? null;
                  setFotoFile(arquivo);
                  setFotoRemovida(false);
                  setFotoPreview(
                    arquivo ? URL.createObjectURL(arquivo) : (inicial?.foto_url ?? null)
                  );
                }}
                className="text-sm text-zinc-400 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-zinc-900"
                aria-label="Enviar foto do candidato"
              />
              {(fotoFile || (inicial?.foto_url && !fotoRemovida)) && (
                <button
                  type="button"
                  onClick={() => {
                    setFotoFile(null);
                    setFotoRemovida(true);
                    setFotoPreview(null);
                  }}
                  className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                >
                  Remover foto
                </button>
              )}
            </div>
          </div>

          <div className="sm:col-span-2">
            <span className={rotulo}>Logo (PNG transparente, opcional)</span>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                accept="image/png,image/webp,image/svg+xml"
                onChange={(e) => {
                  setLogoFile(e.target.files?.[0] ?? null);
                  setLogoRemovida(false);
                }}
                className="text-sm text-zinc-400 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-zinc-900"
              />
              {(logoFile || (inicial?.logo_url && !logoRemovida)) && (
                <button
                  type="button"
                  onClick={() => {
                    setLogoFile(null);
                    setLogoRemovida(true);
                  }}
                  className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                >
                  Remover logo
                </button>
              )}
            </div>
          </div>
        </div>

        <fieldset className="rounded-lg border border-zinc-800 p-4">
          <legend className="px-1 text-sm font-semibold text-zinc-400">
            Modelos disponíveis para os apoiadores
          </legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {templates.map((t) => (
              <label
                key={t.id}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-zinc-800 px-3 text-sm text-zinc-200 hover:bg-zinc-900"
              >
                <input
                  type="checkbox"
                  checked={templatesAtivos.includes(t.id)}
                  onChange={() => alternarTemplate(t.id)}
                  className="h-4 w-4 accent-zinc-100"
                />
                {t.nome}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-zinc-200">
          <input
            type="checkbox"
            checked={ativo}
            onChange={(e) => setAtivo(e.target.checked)}
            className="h-5 w-5 accent-emerald-500"
          />
          <span>
            <strong className="block">Página ativa</strong>
            <span className="text-zinc-500">
              Desative para cortar o acesso dos apoiadores a este link.
            </span>
          </span>
        </label>

        {erro && (
          <p role="alert" className="text-sm font-semibold text-red-400">
            {erro}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={salvando}
            className="rounded-md bg-white px-6 py-2.5 font-semibold text-zinc-950 hover:bg-zinc-200 disabled:opacity-60"
          >
            {salvando
              ? "Salvando…"
              : editando
                ? "Salvar alterações"
                : "Cadastrar candidato"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/painel")}
            className="rounded-md border border-zinc-700 px-6 py-2.5 font-semibold text-zinc-300 hover:bg-zinc-800"
          >
            Cancelar
          </button>
        </div>
      </form>

      <aside>
        <PreviewArte
          dados={dadosPreview}
          templatesAtivos={templatesAtivos}
          logo={logoImg}
        />
      </aside>
    </div>
  );
}
