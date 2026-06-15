'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  CircleHelp,
  FilePlus2,
  Files,
  Leaf,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { supplierLogout } from '@/actions/supplier-auth';

const NAVIGATION = [
  { href: '/fornecedor/envios', label: 'Meus envios', icon: Files },
  { href: '/fornecedor/nova-medicao', label: 'Novo envio', icon: FilePlus2 },
] as const;

export function SupplierPortalShell({
  children,
  userLabel,
}: {
  children: React.ReactNode;
  userLabel: string;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f6f8f7] text-slate-900">
      <div
        className={`fixed inset-0 z-30 bg-slate-900/30 transition md:hidden ${
          menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setMenuOpen(false)}
      />

      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen w-72 flex-col bg-white shadow-xl shadow-slate-200/70 transition-transform ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-6">
          <Link href="/fornecedor/envios" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-700 text-white">
              <Leaf className="h-6 w-6" />
            </span>
            <span>
              <span className="block text-sm font-bold uppercase tracking-[0.16em] text-emerald-800">
                EcoTracker
              </span>
              <span className="block text-xs text-slate-500">Portal do fornecedor</span>
            </span>
          </Link>
          <button
            type="button"
            className="rounded-full bg-slate-100 p-2 text-slate-500 md:hidden"
            onClick={() => setMenuOpen(false)}
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-2 px-4 py-6">
          <p className="px-4 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Documentos
          </p>
          {NAVIGATION.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href === '/fornecedor/envios' && pathname.startsWith('/fornecedor/medicoes/'));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  active
                    ? 'bg-emerald-50 text-emerald-800 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 px-4 py-5">
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Sessão ativa
            </p>
            <p className="mt-1 truncate text-xs font-semibold text-slate-700">{userLabel}</p>
          </div>
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="mt-3 flex w-full items-center justify-between rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Como usar
            <CircleHelp className="h-4 w-4 text-emerald-700" />
          </button>
          <form action={supplierLogout}>
            <button
              type="submit"
              className="mt-1 flex w-full items-center justify-between rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-red-50 hover:text-red-700"
            >
              Sair
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </aside>

      <div className="min-h-screen md:pl-72">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-[#f6f8f7]/90 px-4 py-3 backdrop-blur md:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-4 py-2 text-xs font-bold text-white"
          >
            <Menu className="h-4 w-4" />
            Menu
          </button>
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
            EcoTracker
          </span>
        </header>

        <main className="px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-6xl rounded-[28px] bg-white/95 p-5 shadow-[0_24px_70px_rgba(148,163,184,0.22)] sm:p-7">
            {children}
          </div>
        </main>
      </div>

      {helpOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
          onClick={() => setHelpOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                  Ajuda rápida
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">Como usar o portal</h2>
              </div>
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                className="rounded-full bg-slate-100 p-2 text-slate-500"
                aria-label="Fechar ajuda"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ol className="mt-5 space-y-3 text-sm text-slate-600">
              <li className="rounded-2xl bg-slate-50 p-4">
                <strong className="text-slate-900">1. Novo envio:</strong> informe competência,
                responsável e selecione os PDFs.
              </li>
              <li className="rounded-2xl bg-slate-50 p-4">
                <strong className="text-slate-900">2. Meus envios:</strong> acompanhe protocolo,
                status e data de cada medição.
              </li>
              <li className="rounded-2xl bg-slate-50 p-4">
                <strong className="text-slate-900">3. Visualização:</strong> abra uma medição e
                visualize os PDFs enviados.
              </li>
            </ol>
          </section>
        </div>
      )}
    </div>
  );
}
