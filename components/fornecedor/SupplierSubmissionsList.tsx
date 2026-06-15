'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { FileText, LayoutGrid, Search, TableProperties } from 'lucide-react';
import type { SubmissionStatus } from '@/lib/supplier-documents';
import { SubmissionStatusBadge } from './SubmissionStatusBadge';

export interface SupplierSubmissionView {
  id: string;
  protocol: string;
  responsibleName: string | null;
  competence: string;
  status: SubmissionStatus;
  submittedAt: string;
  fileCount: number;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Manaus',
  }).format(new Date(value));
}

export function SupplierSubmissionsList({
  submissions,
}: {
  submissions: SupplierSubmissionView[];
}) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | SubmissionStatus>('all');
  const [view, setView] = useState<'table' | 'cards'>('table');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return submissions.filter((submission) => {
      const statusMatches = status === 'all' || submission.status === status;
      const textMatches =
        !term ||
        submission.protocol.toLowerCase().includes(term) ||
        submission.competence.toLowerCase().includes(term) ||
        submission.responsibleName?.toLowerCase().includes(term);
      return statusMatches && textMatches;
    });
  }, [search, status, submissions]);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-slate-50 p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por protocolo, competência ou responsável..."
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as 'all' | SubmissionStatus)}
            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-600 outline-none"
            aria-label="Filtrar por status"
          >
            <option value="all">Todos os status</option>
            <option value="submitted">Recebidas</option>
            <option value="under_review">Em análise</option>
            <option value="correction_requested">Correção solicitada</option>
            <option value="approved">Aprovadas</option>
            <option value="rejected">Rejeitadas</option>
          </select>
          <div className="inline-flex h-12 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => setView('table')}
              className={`px-4 ${view === 'table' ? 'bg-emerald-50 text-emerald-800' : 'text-slate-500'}`}
              aria-label="Visualização em tabela"
            >
              <TableProperties className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setView('cards')}
              className={`border-l border-slate-200 px-4 ${
                view === 'cards' ? 'bg-emerald-50 text-emerald-800' : 'text-slate-500'
              }`}
              aria-label="Visualização em cards"
            >
              <LayoutGrid className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-14 text-center">
          <FileText className="mx-auto h-9 w-9 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-700">Nenhum envio encontrado</p>
          <p className="mt-1 text-sm text-slate-400">
            Ajuste os filtros ou envie sua primeira medição.
          </p>
        </div>
      ) : view === 'table' ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Protocolo</th>
                <th className="px-4 py-3">Competência</th>
                <th className="px-4 py-3">Responsável</th>
                <th className="px-4 py-3">Arquivos</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Enviado em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((submission) => (
                <tr key={submission.id} className="transition hover:bg-emerald-50/30">
                  <td className="px-4 py-4">
                    <Link
                      href={`/fornecedor/medicoes/${submission.id}`}
                      className="font-mono text-xs font-bold text-emerald-700 hover:underline"
                    >
                      {submission.protocol}
                    </Link>
                  </td>
                  <td className="px-4 py-4 font-semibold text-slate-800">{submission.competence}</td>
                  <td className="px-4 py-4 text-slate-600">
                    {submission.responsibleName ?? 'Não informado'}
                  </td>
                  <td className="px-4 py-4 text-slate-600">{submission.fileCount}</td>
                  <td className="px-4 py-4">
                    <SubmissionStatusBadge status={submission.status} />
                  </td>
                  <td className="px-4 py-4 text-slate-500">{formatDate(submission.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((submission) => (
            <Link
              key={submission.id}
              href={`/fornecedor/medicoes/${submission.id}`}
              className="rounded-2xl border border-slate-200 p-5 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-slate-900">{submission.competence}</p>
                  <p className="mt-1 font-mono text-xs text-slate-400">{submission.protocol}</p>
                </div>
                <SubmissionStatusBadge status={submission.status} />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-slate-500">
                <div>
                  <p className="font-bold uppercase tracking-wide text-slate-400">Responsável</p>
                  <p className="mt-1 text-slate-700">{submission.responsibleName ?? 'Não informado'}</p>
                </div>
                <div>
                  <p className="font-bold uppercase tracking-wide text-slate-400">Arquivos</p>
                  <p className="mt-1 text-slate-700">{submission.fileCount} PDF(s)</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
