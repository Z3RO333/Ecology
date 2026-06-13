import type { DefaultSession } from 'next-auth';
import type { AppRole } from '@/lib/access-control';

declare module 'next-auth' {
  interface Session {
    user: {
      role: AppRole;
      supplierId?: string;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: AppRole;
    supplierId?: string;
  }
}
