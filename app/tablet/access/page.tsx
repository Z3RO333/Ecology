export default async function TabletAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center px-5">
      <form
        action="/api/tablet/access"
        method="post"
        className="w-full max-w-md bg-white border border-green-100 rounded-3xl p-8 shadow-sm space-y-5"
      >
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-green-600">
            Acesso operacional
          </p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">EcoTracker Tablet</h1>
          <p className="text-gray-500 mt-2">
            Informe a chave configurada para este dispositivo.
          </p>
        </div>

        <input
          name="accessKey"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          required
          autoFocus
          aria-label="Chave de acesso do tablet"
          className="w-full border-2 border-gray-200 rounded-2xl px-5 py-4 text-xl text-center outline-none focus:border-green-500"
        />

        {error && (
          <p className="text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 text-center">
            Chave de acesso inválida.
          </p>
        )}

        <button
          type="submit"
          className="w-full bg-green-600 text-white rounded-2xl py-4 text-lg font-bold"
        >
          Entrar no tablet
        </button>
      </form>
    </div>
  );
}

