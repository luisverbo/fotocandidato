import Link from "next/link";

export default function Landing() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <span className="font-display text-2xl font-extrabold uppercase tracking-wide">
          Santinho Digital
        </span>
        <Link
          href="/login"
          className="rounded-lg border border-neutral-300 px-5 py-3 text-sm font-semibold hover:bg-neutral-100"
        >
          Entrar
        </Link>
      </header>

      <section className="flex flex-1 flex-col justify-center py-16">
        <h1 className="font-display text-5xl font-extrabold uppercase leading-none sm:text-7xl">
          A foto do apoiador
          <br />
          na arte do candidato
        </h1>
        <p className="mt-6 max-w-xl text-lg text-neutral-600">
          Cadastre seus candidatos, envie um link exclusivo e cada apoiador
          coloca a própria foto numa arte de campanha pronta para postar no
          Instagram, WhatsApp e Facebook. Sem aplicativo, sem designer, direto
          do celular.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/login"
            className="rounded-xl bg-neutral-900 px-8 py-4 text-base font-semibold text-white hover:bg-neutral-700"
          >
            Começar agora
          </Link>
          <Link
            href="/cola"
            className="rounded-xl border-2 border-neutral-300 px-8 py-4 text-base font-semibold text-neutral-900 hover:bg-neutral-100"
          >
            Cola Digital
          </Link>
        </div>
        <ul className="mt-14 grid gap-4 text-sm text-neutral-600 sm:grid-cols-3">
          <li className="rounded-xl border border-neutral-200 p-4">
            <strong className="block text-neutral-900">Link que viraliza</strong>
            Um link por candidato, pronto para o grupo de WhatsApp.
          </li>
          <li className="rounded-xl border border-neutral-200 p-4">
            <strong className="block text-neutral-900">Privacidade total</strong>
            A foto do apoiador nunca sai do celular dele.
          </li>
          <li className="rounded-xl border border-neutral-200 p-4">
            <strong className="block text-neutral-900">Métricas de uso</strong>
            Veja quantas artes cada campanha gerou.
          </li>
        </ul>
      </section>

      <footer className="py-6 text-sm text-neutral-400">
        Santinho Digital — artes de campanha geradas no navegador.
      </footer>
    </main>
  );
}
