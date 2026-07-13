import Link from 'next/link';
import { ArrowLeft, ArrowRight, CheckCircle2, PackageCheck, RotateCcw, Send, Workflow } from 'lucide-react';

const steps = [
  { href: '/tablet/bags/enviar', number: '01', title: 'Enviar', description: 'Loja envia bags para o CD', Icon: Send, tone: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  { href: '/tablet/bags/receber', number: '02', title: 'Receber', description: 'CD confirma o recebimento', Icon: PackageCheck, tone: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  { href: '/tablet/bags/devolver', number: '03', title: 'Devolver', description: 'CD devolve bags para a loja', Icon: RotateCcw, tone: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500' },
  { href: '/tablet/bags/receber-volta', number: '04', title: 'Concluir retorno', description: 'Loja confirma a devolução', Icon: CheckCircle2, tone: 'bg-cyan-50 text-cyan-700 border-cyan-200', dot: 'bg-cyan-500' },
];

export default function TabletBagsHubPage() {
  return (
    <main className="min-h-screen bg-[#f5f7fb] px-5 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/tablet" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-white hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Voltar ao menu
        </Link>

        <header className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-lg shadow-blue-900/15">
              <Workflow className="h-7 w-7" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Ciclo operacional</p>
              <h1 className="mt-1 text-3xl font-bold tracking-[-0.035em] text-slate-950 sm:text-4xl">Movimentação de bags</h1>
              <p className="mt-2 max-w-xl text-sm text-slate-500 sm:text-base">Selecione a etapa que está acontecendo agora. O histórico será atualizado automaticamente.</p>
            </div>
          </div>
        </header>

        <div className="relative mt-9 grid gap-4 sm:grid-cols-2">
          {steps.map(({ href, number, title, description, Icon, tone, dot }, index) => (
            <Link
              key={href}
              href={href}
              className="app-card app-card-interactive group page-enter relative flex min-h-44 items-center gap-5 overflow-hidden rounded-[24px] p-6 active:scale-[0.99]"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <span className="absolute right-4 top-2 text-7xl font-black tracking-tighter text-slate-900/[0.035]">{number}</span>
              <span className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${tone}`}>
                <Icon className="h-6 w-6" />
              </span>
              <span className="relative min-w-0 flex-1">
                <span className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  <span className={`h-2 w-2 rounded-full ${dot}`} /> Etapa {number}
                </span>
                <span className="block text-xl font-bold text-slate-900 sm:text-2xl">{title}</span>
                <span className="mt-1.5 block text-sm leading-5 text-slate-500">{description}</span>
              </span>
              <ArrowRight className="relative h-5 w-5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-slate-600" />
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
