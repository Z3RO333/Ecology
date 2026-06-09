import NextAuth from 'next-auth';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';

const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN?.toLowerCase();

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
    // Restrict sign-in to a single email domain when ALLOWED_EMAIL_DOMAIN is set.
    signIn({ profile }) {
      if (!ALLOWED_DOMAIN) return true;
      const email = (profile?.email ?? (profile as { preferred_username?: string })?.preferred_username ?? '').toLowerCase();
      return email.endsWith(`@${ALLOWED_DOMAIN}`);
    },
  },
});
