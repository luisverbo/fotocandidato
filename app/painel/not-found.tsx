import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <div className="py-24 text-center">
      <h1 className="text-2xl font-bold text-white">Candidato não encontrado</h1>
      <p className="mt-2 text-zinc-400">
        Esse candidato não existe ou não pertence à sua conta.
      </p>
      <Link
        href="/painel"
        className="mt-6 inline-block rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950"
      >
        Voltar aos candidatos
      </Link>
    </div>
  );
}
