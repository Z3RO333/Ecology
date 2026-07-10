import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/access-control';
import { listInternalUsers } from '@/lib/internal-users';
import { getLocais } from '@/lib/locations';
import { createUserAction, resetPasswordAction, toggleUserActiveAction } from '@/actions/user-admin';

async function UsersContent() {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, 'users:manage')) {
    redirect('/dashboard');
  }

  const [users, locais] = await Promise.all([
    listInternalUsers(),
    getLocais(),
  ]);

  return (
    <div className="space-y-6">
      {/* Create user form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Novo usuario</h2>
        <form action={async (formData: FormData) => {
          'use server';
          await createUserAction({ success: false }, formData);
        }} className="grid grid-cols-4 gap-3 items-end">
          <div>
            <label htmlFor="display_name" className="block text-xs font-medium text-gray-500 mb-1">Nome</label>
            <input
              id="display_name"
              name="display_name"
              required
              placeholder="Nome completo"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label htmlFor="user_email" className="block text-xs font-medium text-gray-500 mb-1">E-mail</label>
            <input
              id="user_email"
              name="email"
              type="email"
              required
              placeholder="email@bemol.com.br"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label htmlFor="user_role" className="block text-xs font-medium text-gray-500 mb-1">Perfil</label>
            <select
              id="user_role"
              name="role"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
            >
              <option value="operational">Operacional</option>
              <option value="manager">Gestor</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <button
            type="submit"
            className="bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-bold hover:bg-green-700"
          >
            Cadastrar
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-2">
          Senha temporaria: <strong>Bemol@2026</strong> — o usuario sera obrigado a trocar no primeiro acesso.
        </p>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Perfil</th>
              <th className="px-4 py-3 font-medium">Unidade</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Primeiro Acesso</th>
              <th className="px-4 py-3 font-medium">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{u.display_name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    u.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                    u.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {u.role === 'admin' ? 'Admin' : u.role === 'manager' ? 'Gestor' : 'Operacional'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{u.local_nome ?? '—'}</td>
                <td className="px-4 py-3">
                  {u.active ? (
                    <span className="text-green-600 font-semibold">Ativo</span>
                  ) : (
                    <span className="text-red-600 font-semibold">Inativo</span>
                  )}
                  {u.must_change_password && u.active && (
                    <span className="ml-2 text-amber-600 text-xs">(senha temp.)</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {u.first_access_at
                    ? new Date(u.first_access_at).toLocaleString('pt-BR')
                    : 'Nunca acessou'}
                </td>
                <td className="px-4 py-3 space-x-2">
                  <form action={async (formData: FormData) => {
                    'use server';
                    await resetPasswordAction(formData);
                  }} className="inline">
                    <input type="hidden" name="user_id" value={u.id} />
                    <button type="submit" className="text-xs text-amber-600 hover:text-amber-800 font-medium">
                      Resetar senha
                    </button>
                  </form>
                  <form action={async (formData: FormData) => {
                    'use server';
                    await toggleUserActiveAction(formData);
                  }} className="inline">
                    <input type="hidden" name="user_id" value={u.id} />
                    <input type="hidden" name="active" value={u.active ? 'false' : 'true'} />
                    <button type="submit" className={`text-xs font-medium ${u.active ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}>
                      {u.active ? 'Desativar' : 'Ativar'}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {!users.length && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  Nenhum usuario cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function UsuariosPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Gerenciar Usuarios</h1>
      <Suspense
        fallback={<div className="text-center py-12 text-gray-400 text-sm">Carregando...</div>}
      >
        <UsersContent />
      </Suspense>
    </div>
  );
}
