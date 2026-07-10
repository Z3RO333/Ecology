import Link from 'next/link';

export default function TabletBagsHubPage() {
  return (
    <div className="min-h-screen bg-blue-50 flex flex-col">
      <div className="bg-blue-600 text-white px-6 py-8 text-center">
        <h1 className="text-4xl font-bold">Bags Retornaveis</h1>
        <p className="text-blue-100 text-lg mt-2">Ciclo completo: envio, recebimento, devolução</p>
      </div>

      <div className="flex-1 flex items-center justify-center px-5 py-8">
        <div className="w-full max-w-xl grid grid-cols-2 gap-5">
          <Link
            href="/tablet/bags/enviar"
            className="bg-orange-500 active:bg-orange-600 text-white rounded-3xl p-8 text-center shadow-md transition-colors"
          >
            <span className="text-5xl block mb-3">&#128230;</span>
            <span className="text-xl font-bold block">1. Enviar</span>
            <span className="text-orange-100 text-sm mt-1 block">Loja envia bags para o CD</span>
          </Link>

          <Link
            href="/tablet/bags/receber"
            className="bg-green-500 active:bg-green-600 text-white rounded-3xl p-8 text-center shadow-md transition-colors"
          >
            <span className="text-5xl block mb-3">&#9989;</span>
            <span className="text-xl font-bold block">2. Receber</span>
            <span className="text-green-100 text-sm mt-1 block">CD confirma recebimento</span>
          </Link>

          <Link
            href="/tablet/bags/devolver"
            className="bg-purple-500 active:bg-purple-600 text-white rounded-3xl p-8 text-center shadow-md transition-colors"
          >
            <span className="text-5xl block mb-3">&#128257;</span>
            <span className="text-xl font-bold block">3. Devolver</span>
            <span className="text-purple-100 text-sm mt-1 block">CD devolve bags para a loja</span>
          </Link>

          <Link
            href="/tablet/bags/receber-volta"
            className="bg-teal-500 active:bg-teal-600 text-white rounded-3xl p-8 text-center shadow-md transition-colors"
          >
            <span className="text-5xl block mb-3">&#127919;</span>
            <span className="text-xl font-bold block">4. Receber Volta</span>
            <span className="text-teal-100 text-sm mt-1 block">Loja confirma devolução</span>
          </Link>

          <Link
            href="/dashboard/bags"
            className="col-span-2 text-center text-blue-600 underline text-lg mt-2"
          >
            Voltar ao painel
          </Link>
        </div>
      </div>
    </div>
  );
}
