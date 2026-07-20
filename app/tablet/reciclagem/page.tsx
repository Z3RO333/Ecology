import Link from 'next/link';
import { ArrowRight, Building2, PackageOpen, Recycle } from 'lucide-react';

const actions = [
  {
    href: '/tablet/reciclagem/cd',
    eyebrow: 'Formulário',
    title: 'Centro de Distribuição',
    description: 'Todos os materiais recicláveis: papel, plástico, metal, vidro e mais.',
    Icon: PackageOpen,
    color: 'from-emerald-500 to-green-700',
  },
  {
    href: '/tablet/reciclagem/escritorio',
    eyebrow: 'Formulário',
    title: 'Escritório',
    description: 'Lixo comum e outros materiais gerados nos escritórios.',
    Icon: Building2,
    color: 'from-sky-500 to-blue-700',
  },
];

export default function ReciclagemMenuPage() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#f3f7f4]">
      <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-emerald-200/40 blur-3xl" />
      <header className="relative border-b border-emerald-950/10 bg-white/82 px-5 py-5 backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-700 text-white shadow-lg shadow-emerald-900/15">
            <Recycle className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-[-0.025em] text-slate-950 sm:text-2xl">Registrar reciclagem</h1>
            <p className="text-xs font-medium text-slate-500 sm:text-sm">Medições</p>
          </div>
        </div>
      </header>

      <section className="relative flex flex-1 items-center px-5 py-10 sm:px-8">
        <div className="mx-auto w-full max-w-4xl">
          <div className="mb-7 text-center sm:text-left">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Qual formulário?</p>
            <h2 className="mt-2 text-3xl font-bold tracking-[-0.035em] text-slate-950 sm:text-4xl">Escolha o local do registro</h2>
            <p className="mt-2 text-sm text-slate-500 sm:text-base">Centro de Distribuição ou Escritório.</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {actions.map(({ href, eyebrow, title, description, Icon, color }, index) => (
              <Link
                key={href}
                href={href}
                className={`group page-enter relative min-h-64 overflow-hidden rounded-[28px] bg-gradient-to-br ${color} p-7 text-white shadow-xl shadow-slate-900/10 transition duration-300 hover:-translate-y-1 hover:shadow-2xl active:scale-[0.98] sm:p-8`}
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <span className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full border-[28px] border-white/8" />
                <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white/18 text-white">
                  <Icon className="h-7 w-7" />
                </span>
                <span className="relative mt-8 block text-xs font-bold uppercase tracking-[0.16em] text-white/70">{eyebrow}</span>
                <span className="relative mt-1.5 block text-2xl font-bold tracking-tight sm:text-3xl">{title}</span>
                <span className="relative mt-2 block max-w-sm text-sm leading-6 text-white/78 sm:text-base">{description}</span>
                <span className="absolute bottom-7 right-7 flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-900 shadow-lg transition-transform duration-300 group-hover:translate-x-1">
                  <ArrowRight className="h-5 w-5" />
                </span>
              </Link>
            ))}
          </div>

          <Link
            href="/tablet"
            className="mt-7 block text-center text-sm font-semibold text-emerald-700 underline sm:text-left"
          >
            Voltar ao menu
          </Link>
        </div>
      </section>
    </main>
  );
}
