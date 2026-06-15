import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isAuthorized } from '@/lib/authorization';
import { listInternalSubmissions } from '@/lib/supplier-documents';
import { SubmissionStatusBadge } from '@/components/fornecedor/SubmissionStatusBadge';

function formatCompetence(value: string | Date | null): string {
  if (!value) return '—';
  const iso = value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
  const [year, month] = iso.split('-');
  return `${month}/${year}`;
}

function formatDate(value: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Manaus',
  }).format(new Date(value));
}

export default async function MedicoesPage() {
  if (!(await isAuthorized('supplier-documents:review'))) notFound();
  const submissions = await listInternalSubmissions();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-green-700">
          Documentos de fornecedores
        </p>
        <h1 className="mt-1 text-2xl font-bold text-gray-950">Medições</h1>
        <p className="mt-1 text-sm text-gray-500">
          Consulte os protocolos recebidos e abra os PDFs originais.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[840px] text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Protocolo</th>
              <th className="px-4 py-3">Fornecedor</th>
              <th className="px-4 py-3">Competência</th>
              <th className="px-4 py-3">Responsável</th>
              <th className="px-4 py-3">Arquivos</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Recebida em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {submissions.map((submission) => (
              <tr key={submission.id} className="hover:bg-green-50/30">
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/medicoes/${submission.id}`}
                    className="font-mono text-xs font-semibold text-green-700 hover:underline"
                  >
                    {submission.protocol}
                  </Link>
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{submission.supplier_name}</td>
                <td className="px-4 py-3 text-gray-600">
                  {formatCompetence(submission.competence_start)}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {submission.responsible_name ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-600">{submission.file_count}</td>
                <td className="px-4 py-3">
                  <SubmissionStatusBadge status={submission.status} />
                </td>
                <td className="px-4 py-3 text-gray-500">{formatDate(submission.submitted_at)}</td>
              </tr>
            ))}
            {submissions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  Nenhuma medição recebida.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
