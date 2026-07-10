import NextAuth from 'next-auth';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';
import Credentials from 'next-auth/providers/credentials';
import { APP_ROLES, type AppRole } from '@/lib/access-control';
import { resolveJwtRole } from '@/lib/auth-role';
import { resolveInternalRole } from '@/lib/internal-roles';
import { verifySupplierPassword } from '@/lib/suppliers';
import { verifyInternalPassword } from '@/lib/internal-users';

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
      id: 'internal-password',
      name: 'Equipe',
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        const email = String(creds?.email ?? '');
        const password = String(creds?.password ?? '');
        if (!email || !password) return null;
        const user = await verifyInternalPassword(email, password);
        if (!user) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.display_name,
          role: user.role,
          mustChangePassword: user.must_change_password,
          localId: user.local_id,
        } as never;
      },
    }),
    Credentials({
      id: 'supplier-password',
      name: 'Fornecedor',
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        const email = String(creds?.email ?? '');
        const password = String(creds?.password ?? '');
        if (!email || !password) return null;
        if (ALLOWED_DOMAIN && email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`)) return null;
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
      if (account?.provider === 'supplier-password') return true;
      if (account?.provider === 'internal-password') return true;

      const entraProfile = profile as EntraProfile | undefined;
      if (ALLOWED_DOMAIN && (!EXPECTED_TENANT_ID || entraProfile?.tid !== EXPECTED_TENANT_ID)) {
        return false;
      }
      const email = entraProfile?.email?.toLowerCase();
      if (!email) return false;
      if (ALLOWED_DOMAIN && !email.endsWith(`@${ALLOWED_DOMAIN}`)) return false;
      return resolveInternalRole(email) !== null;
    },
    jwt({ token, user, profile }) {
      const credentialsUser = user as {
        id?: string;
        role?: AppRole;
        supplierId?: string;
        mustChangePassword?: boolean;
        localId?: string;
      } | undefined;

      if (credentialsUser?.id) {
        token.sub = credentialsUser.id;
      }

      token.role = resolveJwtRole({
        currentRole: isAppRole(token.role) ? token.role : undefined,
        credentialsRole: credentialsUser?.role,
        entraEmail: (profile as EntraProfile | undefined)?.email,
      });

      if (credentialsUser?.role) {
        token.supplierId = credentialsUser.supplierId;
      }
      if (credentialsUser?.mustChangePassword !== undefined) {
        token.mustChangePassword = credentialsUser.mustChangePassword;
      }
      if (credentialsUser?.localId) {
        token.localId = credentialsUser.localId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && isAppRole(token.role)) session.user.role = token.role;
      if (session.user) {
        session.user.id = token.sub!;
        session.user.supplierId = token.supplierId as string | undefined;
        session.user.mustChangePassword = token.mustChangePassword as boolean | undefined;
        session.user.localId = token.localId as string | undefined;
      }
      return session;
    },
  },
});
