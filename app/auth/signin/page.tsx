import { signIn } from '@/lib/auth';

export default function SignInPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string };
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-sm text-center">
        <div className="text-4xl mb-4">♻</div>
        <h1 className="text-xl font-bold text-gray-900 mb-1">EcoTracker</h1>
        <p className="text-gray-500 text-sm mb-6">Painel Gerencial</p>
        <form
          action={async () => {
            'use server';
            await signIn('microsoft-entra-id', {
              redirectTo: searchParams.callbackUrl ?? '/dashboard',
            });
          }}
        >
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
          >
            Entrar com Microsoft
          </button>
        </form>
      </div>
    </div>
  );
}
