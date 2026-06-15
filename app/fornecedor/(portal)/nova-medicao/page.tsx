import { FilePlus2 } from 'lucide-react';
import { SupplierUploadForm } from '@/components/fornecedor/SupplierUploadForm';

export default function NewSupplierSubmissionPage() {
  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 text-emerald-700">
          <FilePlus2 className="h-5 w-5" />
          <p className="text-xs font-bold uppercase tracking-[0.16em]">Formulário de envio</p>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Novo envio</h1>
        <p className="mt-1 text-sm text-slate-500">
          Informe os dados da competência e anexe todas as faturas em PDF.
        </p>
      </header>
      <SupplierUploadForm />
    </div>
  );
}
