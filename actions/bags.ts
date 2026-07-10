'use server';

import { createBag, registrarMovimentacao, getBagByCodigo, getNextBagCode } from '@/lib/bags';
import { canSubmitTabletRecord } from '@/lib/tablet-access';
import { BAG_ACOES } from '@/types/bags';
import type { BagAcao } from '@/types/bags';

interface ActionResult {
  success: boolean;
  error?: string;
  codigo?: string;
}

export async function createBagAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  if (!(await canSubmitTabletRecord())) {
    return { success: false, error: 'Acesso operacional expirado. Entre novamente.' };
  }

  const responsavel = (formData.get('responsavel') as string)?.trim();
  if (!responsavel || responsavel.length < 2) {
    return { success: false, error: 'Informe o nome do responsável.' };
  }

  const localId = (formData.get('local_id') as string) || undefined;
  const setor = (formData.get('setor') as string)?.trim() || undefined;
  const quantidadeRaw = formData.get('quantidade') as string;
  const quantidade = Math.min(Math.max(parseInt(quantidadeRaw, 10) || 1, 1), 100);

  try {
    const codigos: string[] = [];
    for (let i = 0; i < quantidade; i++) {
      const codigo = await getNextBagCode();
      await createBag({
        codigo,
        local_atual_id: localId,
        setor_atual: setor,
        usuario_nome: responsavel,
      });
      codigos.push(codigo);
    }
    return {
      success: true,
      codigo: quantidade === 1 ? codigos[0] : `${codigos[0]} a ${codigos[codigos.length - 1]}`,
    };
  } catch (err) {
    console.error('createBagAction error:', err);
    return { success: false, error: 'Erro ao cadastrar bag. Tente novamente.' };
  }
}

export async function registrarMovimentacaoAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  if (!(await canSubmitTabletRecord())) {
    return { success: false, error: 'Acesso operacional expirado. Entre novamente.' };
  }

  const codigo = (formData.get('codigo') as string)?.trim();
  if (!codigo) {
    return { success: false, error: 'Escaneie ou informe o código da bag.' };
  }

  const acao = formData.get('acao') as BagAcao;
  if (!BAG_ACOES.includes(acao)) {
    return { success: false, error: 'Selecione uma ação válida.' };
  }

  const responsavel = (formData.get('responsavel') as string)?.trim();
  if (!responsavel || responsavel.length < 2) {
    return { success: false, error: 'Informe o nome do responsável.' };
  }

  const localDestinoId = (formData.get('local_destino_id') as string) || undefined;
  const setor = (formData.get('setor') as string)?.trim() || undefined;
  const observacao = (formData.get('observacao') as string)?.trim() || undefined;

  try {
    const bag = await getBagByCodigo(codigo);
    if (!bag) {
      return { success: false, error: `Bag "${codigo}" não encontrada.` };
    }

    await registrarMovimentacao({
      bag_id: bag.id,
      acao,
      local_destino_id: localDestinoId,
      setor,
      usuario_nome: responsavel,
      observacao,
    });

    return { success: true, codigo };
  } catch (err) {
    console.error('registrarMovimentacaoAction error:', err);
    return { success: false, error: 'Erro ao registrar movimentação. Tente novamente.' };
  }
}
