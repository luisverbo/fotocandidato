import ImportadorCsvTse from "@/components/painel/ImportadorCsvTse";
import ImportadorFotosTse from "@/components/painel/ImportadorFotosTse";
import ImportadorTse from "@/components/painel/ImportadorTse";

export const dynamic = "force-dynamic";

export default function PaginaImportacaoTse() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Cola Digital — dados do TSE
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Os candidatos ficam no nosso banco e a página pública{" "}
          <code className="text-zinc-300">/cola</code> consulta daqui.
        </p>
      </div>

      <ImportadorCsvTse />

      <ImportadorFotosTse />

      <details className="rounded-lg border border-zinc-800 p-5">
        <summary className="cursor-pointer text-sm font-semibold text-zinc-400">
          Importação pela API do TSE (bloqueada para servidores)
        </summary>
        <p className="mt-3 max-w-2xl text-sm text-zinc-500">
          O TSE responde 403 para requisições vindas de datacenter, então este
          caminho não funciona a partir da Vercel. Fica aqui apenas para
          diagnóstico e para o caso de o bloqueio ser removido.
        </p>
        <div className="mt-5">
          <ImportadorTse />
        </div>
      </details>
    </div>
  );
}
