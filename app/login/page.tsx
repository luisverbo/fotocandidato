"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [modo, setModo] = useState<"entrar" | "cadastrar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setAviso(null);
    setCarregando(true);
    const supabase = supabaseBrowser();

    try {
      if (modo === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: senha,
        });
        if (error) {
          setErro("E-mail ou senha incorretos.");
          return;
        }
        router.replace("/painel");
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
        });
        if (error) {
          setErro(
            error.message.includes("at least")
              ? "A senha precisa ter pelo menos 6 caracteres."
              : "Não foi possível criar a conta. Tente outro e-mail."
          );
          return;
        }
        if (data.session) {
          router.replace("/painel");
          router.refresh();
        } else {
          setAviso("Conta criada. Confira seu e-mail para confirmar o acesso.");
        }
      }
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="painel-escuro flex min-h-dvh items-center justify-center bg-zinc-950 px-6 text-zinc-100">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="font-display text-2xl font-extrabold uppercase tracking-wide text-white"
        >
          Santinho Digital
        </Link>
        <h1 className="mt-8 text-xl font-semibold">
          {modo === "entrar" ? "Entrar no painel" : "Criar conta"}
        </h1>

        <form onSubmit={enviar} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm text-zinc-400">E-mail</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 text-zinc-100"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-zinc-400">Senha</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={
                modo === "entrar" ? "current-password" : "new-password"
              }
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="h-12 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 text-zinc-100"
            />
          </label>

          {erro && (
            <p role="alert" className="text-sm text-red-400">
              {erro}
            </p>
          )}
          {aviso && (
            <p role="status" className="text-sm text-emerald-400">
              {aviso}
            </p>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="h-12 w-full rounded-lg bg-white font-semibold text-zinc-950 hover:bg-zinc-200 disabled:opacity-60"
          >
            {carregando
              ? "Aguarde…"
              : modo === "entrar"
                ? "Entrar"
                : "Criar conta"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setModo(modo === "entrar" ? "cadastrar" : "entrar");
            setErro(null);
            setAviso(null);
          }}
          className="mt-6 min-h-12 text-sm text-zinc-400 underline-offset-4 hover:text-zinc-200 hover:underline"
        >
          {modo === "entrar"
            ? "Não tem conta? Criar conta"
            : "Já tem conta? Entrar"}
        </button>
      </div>
    </main>
  );
}
