'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Building2,
  ChevronDown,
  ClipboardCheck,
  History,
  LayoutDashboard,
  Leaf,
  LogOut,
  Menu,
  PackageOpen,
  TabletSmartphone,
  Users,
  X,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  manager: 'Gerente de Loja',
  operational: 'Operacional',
  viewer: 'Visualizador',
  supplier: 'Fornecedor',
};

const NAV_ICONS = {
  '/dashboard': LayoutDashboard,
  '/dashboard/records': History,
  '/dashboard/bags': PackageOpen,
  '/dashboard/medicoes': ClipboardCheck,
  '/dashboard/fornecedores': Building2,
  '/dashboard/usuarios': Users,
  '/tablet': TabletSmartphone,
} as const;

export default function Sidebar({
  groups,
  userName,
  userRole,
  onSignOut,
}: {
  groups: NavGroup[];
  userName: string;
  userRole: string;
  onSignOut: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(groups.map((group) => group.label))
  );

  function toggleGroup(label: string) {
    setOpenGroups((previous) => {
      const next = new Set(previous);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  const initials = userName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-emerald-900/10 bg-white/90 px-4 backdrop-blur-xl lg:hidden">
        <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 font-bold text-slate-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 text-white shadow-md shadow-emerald-900/15">
            <Leaf className="h-[18px] w-[18px]" />
          </span>
          EcoTracker
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
          aria-label="Abrir menu"
          aria-expanded={mobileOpen}
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      <button
        type="button"
        aria-label="Fechar menu"
        onClick={() => setMobileOpen(false)}
        className={`fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden ${
          mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        style={{ viewTransitionName: 'dashboard-sidebar' }}
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-[17rem] shrink-0 flex-col border-r border-emerald-950/10 bg-[#fbfdfb] shadow-2xl shadow-slate-950/10 transition-transform duration-300 ease-out lg:sticky lg:top-0 lg:z-30 lg:translate-x-0 lg:shadow-none ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-[76px] items-center gap-3 border-b border-emerald-950/8 px-5">
          <Link href="/dashboard" className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-700 text-white shadow-lg shadow-emerald-900/15">
              <Leaf className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block font-bold tracking-[-0.02em] text-slate-950">EcoTracker</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Gestão ambiental</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 lg:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {groups.map((group) => {
            const isOpen = openGroups.has(group.label);
            return (
              <div key={group.label} className="mb-3">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label)}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 transition-colors hover:text-slate-600"
                  aria-expanded={isOpen}
                >
                  {group.label}
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <div className="overflow-hidden">
                    <div className="mt-1 space-y-1">
                      {group.items.map((item) => {
                        const active = pathname === item.href || (
                          item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`)
                        );
                        const Icon = NAV_ICONS[item.href as keyof typeof NAV_ICONS] ?? Leaf;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                              active
                                ? 'bg-emerald-100/75 text-emerald-900 shadow-sm shadow-emerald-900/5'
                                : 'text-slate-600 hover:bg-white hover:text-slate-950 hover:shadow-sm'
                            }`}
                          >
                            <Icon className={`h-[18px] w-[18px] transition-transform duration-200 group-hover:scale-105 ${active ? 'text-emerald-700' : 'text-slate-400'}`} />
                            {item.label}
                            {active && <span className="absolute right-2.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        <div className="space-y-2 border-t border-emerald-950/8 p-3">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-3 py-3 shadow-sm ring-1 ring-slate-900/5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold text-white">
              {initials || 'ET'}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-slate-900">{userName}</span>
              <span className="block text-xs text-slate-500">{ROLE_LABELS[userRole] ?? userRole}</span>
            </span>
          </div>
          <form action={onSignOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
