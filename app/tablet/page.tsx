import Link from 'next/link';

export default function TabletHomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-green-600 text-white px-6 py-8 text-center">
        <h1 className="text-4xl font-bold">EcoTracker</h1>
        <p className="text-green-100 text-lg mt-2">
          Plataforma de Reciclagem e Rastreabilidade
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center px-5 py-8">
        <div className="w-full max-w-2xl grid grid-cols-2 gap-5">
          <Link
            href="/tablet/reciclagem"
            className="bg-green-500 active:bg-green-600 text-white rounded-3xl p-8 text-center shadow-md transition-colors"
          >
            <span className="text-5xl block mb-3">&#9851;</span>
            <span className="text-2xl font-bold block">Registrar Reciclagem</span>
            <span className="text-green-100 text-base mt-1 block">Peso e materiais</span>
          </Link>

          <Link
            href="/tablet/bags"
            className="bg-blue-500 active:bg-blue-600 text-white rounded-3xl p-8 text-center shadow-md transition-colors"
          >
            <span className="text-5xl block mb-3">&#128230;</span>
            <span className="text-2xl font-bold block">Bags</span>
            <span className="text-blue-100 text-base mt-1 block">Enviar e receber</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
