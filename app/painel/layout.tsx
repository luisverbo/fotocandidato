import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import BotaoSair from "@/components/painel/BotaoSair";

export const dynamic = "force-dynamic";

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="painel-escuro min-h-dvh bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
          <Link
            href="/painel"
            className="font-display text-lg font-extrabold uppercase tracking-wide text-white"
          >
            Santinho Digital
          </Link>
          <div className="flex items-center gap-4 text-sm text-zinc-400">
            <Link href="/painel/metricas" className="hover:text-zinc-200">
              Métricas
            </Link>
            <Link href="/painel/tse" className="hover:text-zinc-200">
              Cola/TSE
            </Link>
            <span className="hidden sm:inline">{user.email}</span>
            <BotaoSair />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
