'use client';

import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Trash2, UploadCloud } from 'lucide-react';

interface UploadResponse {
  id?: string;
  error?: string;
}

export function SupplierUploadForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(
    null
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (files.length === 0) {
      setMessage({ type: 'error', text: 'Selecione ao menos um PDF.' });
      return;
    }
    setPending(true);
    setProgress(15);
    setMessage(null);

    try {
      const formData = new FormData(event.currentTarget);
      formData.delete('files');
      files.forEach((file) => formData.append('files', file));
      setProgress(40);
      const response = await fetch('/api/fornecedor/submissions', {
        method: 'POST',
        body: formData,
      });
      setProgress(85);
      const result = (await response.json()) as UploadResponse;
      if (!response.ok || !result.id) {
        setMessage({ type: 'error', text: result.error ?? 'Não foi possível enviar os arquivos.' });
        return;
      }

      formRef.current?.reset();
      setFiles([]);
      setProgress(100);
      setMessage({ type: 'success', text: 'Medição enviada com sucesso.' });
      router.push(`/fornecedor/medicoes/${result.id}`);
      router.refresh();
    } catch {
      setMessage({ type: 'error', text: 'Falha de conexão durante o envio.' });
    } finally {
      setPending(false);
      window.setTimeout(() => setProgress(0), 800);
    }
  }

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    setFiles(event.target.files ? Array.from(event.target.files) : []);
    setMessage(null);
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function clearFiles() {
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      {progress > 0 && (
        <div className="mb-5 rounded-2xl bg-emerald-50 p-4">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
            <span>Enviando medição</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm font-medium text-slate-700">
          Competência
          <input
            name="competence"
            type="month"
            required
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </label>
        <label className="space-y-1.5 text-sm font-medium text-slate-700">
          Responsável pelo envio
          <input
            name="responsible_name"
            required
            maxLength={150}
            placeholder="Nome completo"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </label>
      </div>

      <label className="mt-4 block space-y-1.5 text-sm font-medium text-slate-700">
        Observações
        <textarea
          name="notes"
          maxLength={2000}
          rows={3}
          placeholder="Informações adicionais sobre esta medição (opcional)"
          className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
      </label>

      <label className="mt-4 block cursor-pointer rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/60 p-6 text-center transition hover:border-emerald-400">
        <UploadCloud className="mx-auto h-8 w-8 text-emerald-700" />
        <span className="mt-2 block text-sm font-semibold text-emerald-900">Selecionar faturas em PDF</span>
        <span className="mt-1 block text-xs text-emerald-700">
          De 1 a 20 arquivos, até 15 MB cada
        </span>
        <input
          ref={fileInputRef}
          name="files"
          type="file"
          accept="application/pdf,.pdf"
          multiple
          required
          onChange={handleFiles}
          className="sr-only"
        />
      </label>

      {files.length > 0 && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-3 px-1 pb-2">
            <p className="text-xs font-bold text-slate-600">{files.length} arquivo(s) selecionado(s)</p>
            <button
              type="button"
              onClick={clearFiles}
              className="text-xs font-semibold text-red-600 hover:text-red-700"
            >
              Limpar todos
            </button>
          </div>
          <ul className="max-h-56 space-y-2 overflow-y-auto">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${file.size}-${index}`}
                className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-emerald-700" />
                  <span className="truncate text-xs font-medium text-slate-700">{file.name}</span>
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  aria-label={`Remover ${file.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {message && (
        <p
          className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
            message.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
          role="status"
        >
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:bg-slate-300 sm:w-auto sm:min-w-44"
      >
        {pending ? 'Enviando arquivos...' : 'Enviar medição'}
      </button>
    </form>
  );
}
