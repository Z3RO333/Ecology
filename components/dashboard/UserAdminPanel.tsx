'use client';

import { useActionState, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createUserAction,
  resetPasswordAction,
  toggleUserActiveAction,
  updateUserAction,
  type UserActionResult,
} from '@/actions/user-admin';
import type { InternalUser } from '@/lib/internal-users';
import type { LocalWithCentro } from '@/lib/locations';
import type { InternalRole } from '@/lib/access-control';
import {
  Building2,
  CheckCircle2,
  Eye,
  KeyRound,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  ShieldOff,
  UserCog,
  Users,
  X,
} from 'lucide-react';

const INITIAL_STATE: UserActionResult = { success: false };

const ROLE_LABELS: Record<InternalRole, string> = {
  admin: 'Administrador',
  manager: 'Gerente de Loja',
  operational: 'Operacional',
  viewer: 'Visualizador',
};

const ROLE_STYLES: Record<InternalRole, string> = {
  admin: 'bg-violet-50 text-violet-700 ring-violet-200',
  manager: 'bg-blue-50 text-blue-700 ring-blue-200',
  operational: 'bg-amber-50 text-amber-700 ring-amber-200',
  viewer: 'bg-slate-100 text-slate-700 ring-slate-200',
};

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{children}</label>;
}

function Feedback({ state }: { state: UserActionResult }) {
  if (!state.error && !state.message) return null;
  return (
    <p aria-live="polite" className={`rounded-xl px-3 py-2 text-sm font-medium ${state.error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
      {state.error ?? state.message}
    </p>
  );
}

function RoleAndUnitFields({
  prefix,
  locais,
  initialRole = 'operational',
  initialLocalId = '',
}: {
  prefix: string;
  locais: LocalWithCentro[];
  initialRole?: InternalRole;
  initialLocalId?: string;
}) {
  const [role, setRole] = useState<InternalRole>(initialRole);
  const unitRequired = role === 'manager';

  return (
    <>
      <div>
        <FieldLabel htmlFor={`${prefix}-role`}>Perfil de acesso</FieldLabel>
        <select id={`${prefix}-role`} name="role" value={role} onChange={(event) => setRole(event.target.value as InternalRole)} required className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100">
          <option value="admin">Administrador</option>
          <option value="manager">Gerente de Loja</option>
          <option value="operational">Operacional</option>
          <option value="viewer">Visualizador</option>
        </select>
      </div>
      <div>
        <FieldLabel htmlFor={`${prefix}-local`}>Unidade {unitRequired && <span className="text-red-500">*</span>}</FieldLabel>
        <select id={`${prefix}-local`} name="local_id" defaultValue={initialLocalId} required={unitRequired} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100">
          <option value="">{unitRequired ? 'Selecione a unidade responsável' : 'Todas / não vinculada'}</option>
          {locais.map((local) => <option key={local.id} value={local.id}>{local.centro ? `${local.centro} · ` : ''}{local.nome}</option>)}
        </select>
        {unitRequired && <p className="mt-1.5 text-xs text-blue-600">O gerente verá e gerenciará somente os dados desta unidade.</p>}
      </div>
    </>
  );
}

function CreateUserForm({ locais }: { locais: LocalWithCentro[] }) {
  const [state, formAction, pending] = useActionState(createUserAction, INITIAL_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!state.success) return;
    formRef.current?.reset();
    router.refresh();
  }, [state.success, router]);

  return (
    <form ref={formRef} action={formAction} className="rounded-3xl border border-emerald-950/10 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><Plus className="h-5 w-5" /></span>
        <div><h2 className="font-bold text-slate-900">Cadastrar usuário</h2><p className="text-sm text-slate-500">A senha temporária inicial será Bemol@2026.</p></div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div><FieldLabel htmlFor="new-name">Nome</FieldLabel><input id="new-name" name="display_name" required placeholder="Nome completo" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></div>
        <div><FieldLabel htmlFor="new-email">E-mail</FieldLabel><input id="new-email" name="email" type="email" required placeholder="nome@empresa.com" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></div>
        <RoleAndUnitFields prefix="new" locais={locais} />
        <div><FieldLabel htmlFor="new-active">Status do acesso</FieldLabel><select id="new-active" name="active" defaultValue="true" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500"><option value="true">Ativo</option><option value="false">Inativo</option></select></div>
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Feedback state={state} />
        <button type="submit" disabled={pending} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"><Plus className="h-4 w-4" />{pending ? 'Cadastrando...' : 'Cadastrar usuário'}</button>
      </div>
    </form>
  );
}

function EditUserDialog({ user, locais, onClose }: { user: InternalUser; locais: LocalWithCentro[]; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(updateUserAction, INITIAL_STATE);
  const router = useRouter();

  useEffect(() => {
    if (!state.success) return;
    router.refresh();
    const timer = window.setTimeout(onClose, 700);
    return () => window.clearTimeout(timer);
  }, [state.success, router, onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="edit-user-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form action={formAction} className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl sm:p-7">
        <input type="hidden" name="user_id" value={user.id} />
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700"><UserCog className="h-5 w-5" /></span><div><h2 id="edit-user-title" className="text-xl font-bold text-slate-950">Editar usuário</h2><p className="text-sm text-slate-500">Altere perfil, unidade ou status de acesso.</p></div></div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Fechar"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><FieldLabel htmlFor="edit-name">Nome</FieldLabel><input id="edit-name" name="display_name" defaultValue={user.display_name ?? ''} required className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></div>
          <div><FieldLabel htmlFor="edit-email">E-mail</FieldLabel><input id="edit-email" name="email" type="email" defaultValue={user.email} required className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></div>
          <RoleAndUnitFields prefix="edit" locais={locais} initialRole={user.role} initialLocalId={user.local_id ?? ''} />
          <div><FieldLabel htmlFor="edit-active">Status do acesso</FieldLabel><select id="edit-active" name="active" defaultValue={String(user.active)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"><option value="true">Ativo</option><option value="false">Inativo</option></select></div>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><Feedback state={state} /><div className="ml-auto flex gap-2"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button><button type="submit" disabled={pending} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">{pending ? 'Salvando...' : 'Salvar alterações'}</button></div></div>
      </form>
    </div>
  );
}

export function UserAdminPanel({ users, locais, supplierUsers }: { users: InternalUser[]; locais: LocalWithCentro[]; supplierUsers: Array<{ email: string; supplierName: string; hasPassword: boolean }> }) {
  const [query, setQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<InternalUser | null>(null);
  const router = useRouter();
  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
  const filteredUsers = useMemo(() => users.filter((user) => !normalizedQuery || [user.display_name, user.email, user.local_nome, ROLE_LABELS[user.role]].some((value) => value?.toLocaleLowerCase('pt-BR').includes(normalizedQuery))), [users, normalizedQuery]);
  const activeUsers = users.filter((user) => user.active).length;
  const managers = users.filter((user) => user.role === 'manager').length;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {[{ label: 'Usuários internos', value: users.length, Icon: Users, tone: 'bg-slate-100 text-slate-700' }, { label: 'Acessos ativos', value: activeUsers, Icon: ShieldCheck, tone: 'bg-emerald-100 text-emerald-700' }, { label: 'Gerentes de loja', value: managers, Icon: Building2, tone: 'bg-blue-100 text-blue-700' }].map(({ label, value, Icon, tone }) => <div key={label} className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"><span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span><div><p className="text-2xl font-bold text-slate-950">{value}</p><p className="text-xs font-semibold text-slate-500">{label}</p></div></div>)}
      </div>

      <CreateUserForm locais={locais} />

      <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-bold text-slate-900">Pessoas cadastradas</h2><p className="text-sm text-slate-500">Consulte e ajuste os acessos internos.</p></div>
          <label className="relative block w-full sm:w-80"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><span className="sr-only">Buscar usuários</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar nome, e-mail ou unidade" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50/80 text-xs font-bold uppercase tracking-[0.08em] text-slate-500"><tr><th className="px-5 py-3">Usuário</th><th className="px-4 py-3">Perfil</th><th className="px-4 py-3">Unidade vinculada</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Último acesso</th><th className="px-5 py-3 text-right">Ações</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="transition hover:bg-slate-50/70">
                  <td className="px-5 py-4"><div className="font-semibold text-slate-900">{user.display_name ?? 'Sem nome'}</div><div className="mt-0.5 text-xs text-slate-500">{user.email}</div></td>
                  <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${ROLE_STYLES[user.role]}`}>{ROLE_LABELS[user.role]}</span></td>
                  <td className="px-4 py-4 text-slate-600">{user.local_nome ? <span className="inline-flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-slate-400" />{user.local_nome}</span> : <span className="text-slate-400">Todas / não vinculada</span>}</td>
                  <td className="px-4 py-4">{user.active ? <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" />Ativo</span> : <span className="inline-flex items-center gap-1.5 font-semibold text-red-600"><ShieldOff className="h-4 w-4" />Inativo</span>}</td>
                  <td className="px-4 py-4 text-xs text-slate-500">{user.first_access_at ? new Date(user.first_access_at).toLocaleString('pt-BR') : 'Nunca acessou'}</td>
                  <td className="px-5 py-4"><div className="flex items-center justify-end gap-1"><button type="button" onClick={() => setSelectedUser(user)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50"><Pencil className="h-3.5 w-3.5" />Editar</button><form action={async (formData) => { await resetPasswordAction(formData); router.refresh(); }}><input type="hidden" name="user_id" value={user.id} /><button type="submit" className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold text-amber-700 hover:bg-amber-50"><KeyRound className="h-3.5 w-3.5" />Senha</button></form><form action={async (formData) => { await toggleUserActiveAction(formData); router.refresh(); }}><input type="hidden" name="user_id" value={user.id} /><input type="hidden" name="active" value={String(!user.active)} /><button type="submit" className={`rounded-lg px-2.5 py-2 text-xs font-bold ${user.active ? 'text-red-600 hover:bg-red-50' : 'text-emerald-700 hover:bg-emerald-50'}`}>{user.active ? 'Desativar' : 'Ativar'}</button></form></div></td>
                </tr>
              ))}
              {!filteredUsers.length && <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">Nenhum usuário encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><summary className="flex cursor-pointer list-none items-center gap-3 font-bold text-slate-800"><Eye className="h-4 w-4 text-slate-500" />Acessos de fornecedores <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{supplierUsers.length}</span></summary><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Fornecedor</th><th className="px-4 py-3">E-mail</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{supplierUsers.map((supplier) => <tr key={supplier.email}><td className="px-4 py-3 font-medium text-slate-800">{supplier.supplierName}</td><td className="px-4 py-3 text-slate-600">{supplier.email}</td><td className="px-4 py-3 font-semibold text-slate-600">{supplier.hasPassword ? 'Acesso ativo' : 'Aguardando ativação'}</td></tr>)}</tbody></table></div></details>

      {selectedUser && <EditUserDialog key={selectedUser.id} user={selectedUser} locais={locais} onClose={() => setSelectedUser(null)} />}
    </div>
  );
}
