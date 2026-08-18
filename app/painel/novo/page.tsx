import CandidatoForm from "@/components/painel/CandidatoForm";

export default function NovoCandidatoPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Novo candidato</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Preencha os dados e veja ao lado como a arte vai ficar.
      </p>
      <div className="mt-8">
        <CandidatoForm />
      </div>
    </div>
  );
}
