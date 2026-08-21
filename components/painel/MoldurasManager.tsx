"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Moldura } from "@/lib/types";

const FORMATOS: { valor: Moldura["formato"]; rotulo: string }[] = [
  { valor: "feed", rotulo: "Feed (1080×1080)" },
  { valor: "perfil", rotulo: "Perfil (1080×1080)" },
  { valor: "story", rotulo: "Story (1080×1920)" },
];

interface Props {
  candidatoId: string;
  iniciais: Moldura[];
}

// Molduras prontas: artes finais do cliente (PNG com área transparente
// onde entra a foto do apoiador). Aparecem em primeiro na página pública.
export default function MoldurasManager({ candidatoId, iniciais }: Props) {
  const [molduras, setMolduras] = useState<Moldura[]>(iniciais);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [nome, setNome] = useState("");
  const [formato, setFormato] = useState<Moldura["formato"]>("feed");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!arquivo) {
      setErro("Escolha o arquivo PNG da arte.");
      return;
    }
    setErro(null);
    setSucesso(null);
    setEnviando(true);
    const supabase = supabaseBrowser();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const extensao = arquivo.type === "image/webp" ? "webp" : "png";
      const caminho = `${user.id}/moldura-${crypto.randomUUID()}.${extensao}`;
      const { error: erroUpload } = await supabase.storage
        .from("logos")
        .upload(caminho, arquivo, { contentType: arquivo.type });
      if (erroUpload) {
        setErro("Não foi possível enviar o arquivo. Tente novamente.");
        return;
      }
      const url = supabase.storage.from("logos").getPublicUrl(caminho).data
        .publicUrl;

      const { data, error } = await supabase
        .from("molduras")
        .insert({
          candidato_id: candidatoId,
          nome: nome.trim() || `Arte ${molduras.length + 1}`,
          formato,
          arquivo_url: url,
        })
        .select()
        .single<Moldura>();

      if (error || !data) {
        setErro(
          "Não foi possível salvar a moldura. Rode a migração 003 no Supabase e tente de novo."
        );
        return;
      }

      setMolduras([...molduras, data]);
      setArquivo(null);
      setNome("");
      setSucesso(
        `Moldura adicionada! Ela já aparece em primeiro na galeria do link público, no formato ${data.formato.toUpperCase()}. A página pública pode levar até 1 minuto para atualizar.`
      );
    } finally {
      setEnviando(false);
    }
  }

  async function excluir(m: Moldura) {
    const supabase = supabaseBrowser();
    const { error } = await supabase.from("molduras").delete().eq("id", m.id);
    if (error) return;
    setMolduras(molduras.filter((x) => x.id !== m.id));

    // Remove o arquivo do Storage (best-effort)
    const caminho = m.arquivo_url.split("/object/public/logos/")[1];
    if (caminho) {
      void supabase.storage.from("logos").remove([decodeURIComponent(caminho)]);
    }
  }

  return (
    <section className="rounded-lg border border-zinc-800 p-4">
      <h2 className="text-sm font-semibold text-zinc-400">
        Molduras prontas (arte final do cliente)
      </h2>
      <p className="mt-1 text-xs text-zinc-500">
        PNG com fundo transparente onde a foto do apoiador aparece — a foto
        entra atrás da arte. Tamanhos: Feed/Perfil 1080×1080 · Story
        1080×1920.
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        <strong className="text-zinc-400">Onde aparece:</strong> no link
        público do candidato (botão “Abrir página” ali em cima). O apoiador
        coloca a foto e a moldura já vem selecionada, em primeiro na galeria
        de modelos — mas só no formato escolhido aqui (uma moldura de Feed
        não aparece no Story).
      </p>

      {molduras.length > 0 && (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {molduras.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-3 rounded-md border border-zinc-800 bg-zinc-900 p-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.arquivo_url}
                alt={`Moldura ${m.nome}`}
                className="h-16 w-16 shrink-0 rounded bg-zinc-700 object-contain"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-zinc-200">
                  {m.nome}
                </p>
                <p className="text-xs uppercase text-zinc-500">{m.formato}</p>
              </div>
              <button
                type="button"
                onClick={() => excluir(m)}
                className="rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
              >
                Excluir
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={enviar}
        className="mt-4 flex flex-wrap items-end gap-3 border-t border-zinc-800 pt-4"
      >
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-zinc-500">
            Arquivo (PNG transparente)
          </span>
          <input
            type="file"
            accept="image/png,image/webp"
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
            className="text-sm text-zinc-400 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-zinc-900"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-zinc-500">
            Formato
          </span>
          <select
            value={formato}
            onChange={(e) => setFormato(e.target.value as Moldura["formato"])}
            className="h-10 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100"
          >
            {FORMATOS.map((f) => (
              <option key={f.valor} value={f.valor}>
                {f.rotulo}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-zinc-500">
            Nome (opcional)
          </span>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Arte oficial"
            className="h-10 w-40 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 placeholder:text-zinc-600"
          />
        </label>
        <button
          type="submit"
          disabled={enviando}
          className="h-10 rounded-md bg-white px-4 text-sm font-semibold text-zinc-950 hover:bg-zinc-200 disabled:opacity-60"
        >
          {enviando ? "Enviando…" : "Adicionar moldura"}
        </button>
      </form>

      {erro && (
        <p role="alert" className="mt-3 text-sm font-semibold text-red-400">
          {erro}
        </p>
      )}
      {sucesso && (
        <p role="status" className="mt-3 text-sm font-semibold text-emerald-400">
          {sucesso}
        </p>
      )}
    </section>
  );
}
