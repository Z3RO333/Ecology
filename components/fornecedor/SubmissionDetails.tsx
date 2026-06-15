import Link from 'next/link';
import type { SubmissionDetails as SubmissionDetailsType } from '@/lib/supplier-documents';
import { SubmissionStatusBadge } from './SubmissionStatusBadge';

function formatCompetence(value: string | Date | null): string {
  if (!value) return 'Não informada';
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

function formatBytes(value: number): string {
  const bytes = Number(value);
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

export function SubmissionDetails({
  submission,
  backHref,
}: {
  submission: SubmissionDetailsType;
  backHref: string;
}) {
  return (
    <div className="space-y-5">
      <Link href={backHref} className="inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-900">
        ← Voltar
      </Link>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-semibold tracking-wide text-slate-500">
              {submission.protocol}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950">
              Medição {formatCompetence(submission.competence_start)}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{submission.supplier_name}</p>
          </div>
          <SubmissionStatusBadge status={submission.status} />
        </div>

        <dl className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Responsável</dt>
            <dd className="mt-1 text-sm font-medium text-slate-800">
              {submission.responsible_name ?? 'Não informado'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Enviada em</dt>
            <dd className="mt-1 text-sm font-medium text-slate-800">
              {formatDate(submission.submitted_at)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Arquivos</dt>
            <dd className="mt-1 text-sm font-medium text-slate-800">
              {submission.file_count} PDF(s) · {formatBytes(submission.total_bytes)}
            </dd>
          </div>
        </dl>

        {submission.notes && (
          <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {submission.notes}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="font-bold text-slate-950">Documentos enviados</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {submission.files.map((file) => (
            <div key={file.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{file.original_name}</p>
                <p className="mt-0.5 text-xs text-slate-400">{formatBytes(file.size_bytes)}</p>
              </div>
              <a
                href={`/api/documents/${file.id}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-600 hover:text-emerald-700"
              >
                Visualizar PDF
              </a>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
