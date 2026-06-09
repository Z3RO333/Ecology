import NextAuth from 'next-auth';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';

const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN?.toLowerCase();
const EXPECTED_TENANT_ID = process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID;

// Shape of the relevant claims in the Entra ID id_token profile.
interface EntraProfile {
  tid?: string;
  email?: string;
  preferred_username?: string;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER!,
    }),
  ],
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    // Restrict sign-in to a single trusted tenant + email domain.
    signIn({ profile }) {
      if (!ALLOWED_DOMAIN) return true;

      const p = profile as EntraProfile | undefined;

      // Fail closed: if domain restriction is on, the expected tenant MUST be
      // configured and MUST match. A missing env var denies access, never grants.
      if (!EXPECTED_TENANT_ID || p?.tid !== EXPECTED_TENANT_ID) return false;

      // Only trust the verified `email` claim — never `preferred_username`,
      // which is user-controllable and not guaranteed to be a verified address.
      const email = p?.email?.toLowerCase();
      if (!email) return false;

      return email.endsWith(`@${ALLOWED_DOMAIN}`);
    },
  },
});
