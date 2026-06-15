import Link from 'next/link';
import { FilePlus2, Files } from 'lucide-react';
import { auth } from '@/lib/auth';
import { listSupplierSubmissions } from '@/lib/supplier-documents';
import {
  SupplierSubmissionsList,
  type SupplierSubmissionView,
} from '@/components/fornecedor/SupplierSubmissionsList';

function formatCompetence(value: string | Date | null): string {
  if (!value) return 'Sem competência';
  const iso = value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
  const [year, month] = iso.split('-');
  return `${month}/${year}`;
}

export default async function SupplierSubmissionsPage() {
  const session = await auth();
  const submissions = await listSupplierSubmissions(session!.user.supplierId!);
  const view: SupplierSubmissionView[] = submissions.map((submission) => ({
    id: submission.id,
    protocol: submission.protocol,
    responsibleName: submission.responsible_name,
    competence: formatCompetence(submission.competence_start),
    status: submission.status,
    submittedAt:
      submission.submitted_at instanceof Date
        ? submission.submitted_at.toISOString()
        : String(submission.submitted_at),
    fileCount: submission.file_count,
  }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-700">
            <Files className="h-5 w-5" />
            <p className="text-xs font-bold uppercase tracking-[0.16em]">Documentos enviados</p>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Meus envios</h1>
          <p className="mt-1 text-sm text-slate-500">
            Acompanhe protocolos, status e PDFs enviados pela sua empresa.
          </p>
        </div>
        <Link
          href="/fornecedor/nova-medicao"
          className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-100 transition hover:bg-emerald-800"
        >
          <FilePlus2 className="h-4 w-4" />
          Novo envio
        </Link>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Total de envios</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{submissions.length}</p>
        </div>
        <div className="rounded-2xl bg-amber-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-600">Em andamento</p>
          <p className="mt-2 text-2xl font-bold text-amber-800">
            {
              submissions.filter((item) =>
                ['submitted', 'under_review', 'correction_requested'].includes(item.status)
              ).length
            }
          </p>
        </div>
        <div className="rounded-2xl bg-emerald-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">Aprovadas</p>
          <p className="mt-2 text-2xl font-bold text-emerald-800">
            {submissions.filter((item) => item.status === 'approved').length}
          </p>
        </div>
      </div>

      <SupplierSubmissionsList submissions={view} />
    </div>
  );
}
