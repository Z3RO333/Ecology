import NextAuth from 'next-auth';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';
import Credentials from 'next-auth/providers/credentials';
import { APP_ROLES, type AppRole } from '@/lib/access-control';
import { resolveInternalRole } from '@/lib/internal-roles';
import { verifySupplierPassword } from '@/lib/suppliers';

const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN?.toLowerCase();
const EXPECTED_TENANT_ID = process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID;

interface EntraProfile {
  tid?: string;
  email?: string;
}

function isAppRole(value: unknown): value is AppRole {
  return typeof value === 'string' && APP_ROLES.includes(value as AppRole);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER!,
    }),
    Credentials({
      id: 'supplier-password',
      name: 'Fornecedor',
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        const email = String(creds?.email ?? '');
        const password = String(creds?.password ?? '');
        if (!email || !password) return null;
        const user = await verifySupplierPassword(email, password);
        if (!user) return null;
        return { id: user.id, email: user.email, role: 'supplier', supplierId: user.supplier_id } as never;
      },
    }),
  ],
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    signIn({ account, profile }) {
      // Supplier credentials are already validated in authorize().
      if (account?.provider === 'supplier-password') return true;

      const entraProfile = profile as EntraProfile | undefined;
      if (ALLOWED_DOMAIN && (!EXPECTED_TENANT_ID || entraProfile?.tid !== EXPECTED_TENANT_ID)) {
        return false;
      }
      // Only trust the verified email claim from Entra ID.
      const email = entraProfile?.email?.toLowerCase();
      if (!email) return false;
      if (ALLOWED_DOMAIN && !email.endsWith(`@${ALLOWED_DOMAIN}`)) return false;
      return resolveInternalRole(email) !== null;
    },
    jwt({ token, user, profile }) {
      // Credentials login: role/supplierId come from authorize()'s returned user.
      const credentialsUser = user as { role?: AppRole; supplierId?: string } | undefined;
      if (credentialsUser?.role) {
        token.role = credentialsUser.role;
        token.supplierId = credentialsUser.supplierId;
        return token;
      }
      // Entra login: derive internal role from the email allowlist.
      const email = (profile as EntraProfile | undefined)?.email ?? token.email;
      if (email) token.role = resolveInternalRole(email) ?? undefined;
      return token;
    },
    session({ session, token }) {
      if (session.user && isAppRole(token.role)) session.user.role = token.role;
      if (session.user) session.user.supplierId = token.supplierId as string | undefined;
      return session;
    },
    authorized({ auth: session, request }) {
      const { pathname } = request.nextUrl;
      const role = session?.user?.role;
      if (pathname.startsWith('/fornecedor')) {
        if (pathname.startsWith('/fornecedor/login') || pathname.startsWith('/fornecedor/primeiro-acesso')) {
          return true;
        }
        return role === 'supplier';
      }
      if (pathname.startsWith('/dashboard')) {
        return role === 'admin' || role === 'manager' || role === 'operational';
      }
      return true;
    },
  },
});
