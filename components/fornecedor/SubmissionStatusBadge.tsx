import type { SubmissionStatus } from '@/lib/supplier-documents';

const STATUS_LABELS: Record<SubmissionStatus, string> = {
  draft: 'Rascunho',
  submitted: 'Recebida',
  under_review: 'Em análise',
  correction_requested: 'Correção solicitada',
  approved: 'Aprovada',
  rejected: 'Rejeitada',
  archived: 'Arquivada',
};

const STATUS_STYLES: Record<SubmissionStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  submitted: 'bg-blue-50 text-blue-700',
  under_review: 'bg-amber-50 text-amber-700',
  correction_requested: 'bg-orange-50 text-orange-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
  archived: 'bg-slate-100 text-slate-500',
};

export function SubmissionStatusBadge({ status }: { status: SubmissionStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
