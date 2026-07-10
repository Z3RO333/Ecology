'use server';

import { criarRemessa, receberIda, enviarVolta, receberVolta } from '@/lib/bag-remessas';
import { getLocalById } from '@/lib/locations';
import { canSubmitTabletRecord } from '@/lib/tablet-access';
import { sendRemessaEnviadaEmail, sendRemessaRecebidaEmail, sendDevolucaoEnviadaEmail, sendVoltaRecebidaEmail } from '@/lib/bag-email';

interface ActionResult {
  success: boolean;
  error?: string;
  remessa_id?: string;
}

export async function enviarBagsAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  if (!(await canSubmitTabletRecord())) {
    return { success: false, error: 'Acesso operacional expirado. Entre novamente.' };
  }

  const origemId = formData.get('origem_id') as string;
  const destinoId = formData.get('destino_id') as string;
  const quantidade = parseInt(formData.get('quantidade') as string, 10);
  const responsavel = (formData.get('responsavel') as string)?.trim();
  const observacao = (formData.get('observacao') as string)?.trim() || undefined;

  if (!origemId || !destinoId) return { success: false, error: 'Selecione origem e destino.' };
  if (origemId === destinoId) return { success: false, error: 'Origem e destino devem ser diferentes.' };
  if (!quantidade || quantidade < 1) return { success: false, error: 'Informe uma quantidade valida.' };
  if (!responsavel || responsavel.length < 2) return { success: false, error: 'Informe o responsavel.' };

  try {
    const remessa = await criarRemessa({
      origem_id: origemId, destino_id: destinoId,
      quantidade_enviada: quantidade, enviado_por: responsavel, observacao_envio: observacao,
    });

    const [origem, destino] = await Promise.all([getLocalById(origemId), getLocalById(destinoId)]);
    sendRemessaEnviadaEmail({
      origemNome: origem?.nome ?? 'Origem', origemId,
      destinoNome: destino?.nome ?? 'Destino', destinoId,
      quantidade, enviadoPor: responsavel, observacao,
    }).catch((e) => console.error('[bag-email] error:', e));

    return { success: true, remessa_id: remessa.id };
  } catch (err) {
    console.error('enviarBagsAction error:', err);
    return { success: false, error: 'Erro ao registrar envio.' };
  }
}

export async function receberIdaAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  if (!(await canSubmitTabletRecord())) {
    return { success: false, error: 'Acesso operacional expirado. Entre novamente.' };
  }

  const remessaId = formData.get('remessa_id') as string;
  const quantidade = parseInt(formData.get('quantidade_recebida') as string, 10);
  const responsavel = (formData.get('responsavel') as string)?.trim();
  const observacao = (formData.get('observacao') as string)?.trim() || undefined;

  if (!remessaId) return { success: false, error: 'Selecione uma remessa.' };
  if (isNaN(quantidade) || quantidade < 0) return { success: false, error: 'Informe a quantidade.' };
  if (!responsavel || responsavel.length < 2) return { success: false, error: 'Informe o responsavel.' };

  try {
    const remessa = await receberIda({
      remessa_id: remessaId, quantidade_recebida: quantidade,
      recebido_por: responsavel, observacao_recebimento: observacao,
    });

    const [origem, destino] = await Promise.all([getLocalById(remessa.origem_id), getLocalById(remessa.destino_id)]);
    sendRemessaRecebidaEmail({
      origemNome: origem?.nome ?? 'Origem', origemId: remessa.origem_id,
      destinoNome: destino?.nome ?? 'Destino', destinoId: remessa.destino_id,
      quantidadeEnviada: remessa.quantidade_enviada, quantidadeRecebida: quantidade,
      enviadoPor: remessa.enviado_por, recebidoPor: responsavel,
      enviadoEm: new Date(remessa.enviado_em).toLocaleString('pt-BR', { timeZone: 'America/Manaus' }),
      observacao,
    }).catch((e) => console.error('[bag-email] error:', e));

    return { success: true, remessa_id: remessaId };
  } catch (err) {
    console.error('receberIdaAction error:', err);
    return { success: false, error: 'Erro ao registrar recebimento.' };
  }
}

export async function enviarVoltaAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  if (!(await canSubmitTabletRecord())) {
    return { success: false, error: 'Acesso operacional expirado. Entre novamente.' };
  }

  const remessaId = formData.get('remessa_id') as string;
  const quantidade = parseInt(formData.get('quantidade') as string, 10);
  const responsavel = (formData.get('responsavel') as string)?.trim();
  const observacao = (formData.get('observacao') as string)?.trim() || undefined;

  if (!remessaId) return { success: false, error: 'Selecione uma remessa.' };
  if (!quantidade || quantidade < 1) return { success: false, error: 'Informe a quantidade.' };
  if (!responsavel || responsavel.length < 2) return { success: false, error: 'Informe o responsavel.' };

  try {
    const remessa = await enviarVolta({
      remessa_id: remessaId, qty_volta_enviada: quantidade,
      volta_enviado_por: responsavel, observacao_volta_envio: observacao,
    });

    const [origem, destino] = await Promise.all([getLocalById(remessa.origem_id), getLocalById(remessa.destino_id)]);
    sendDevolucaoEnviadaEmail({
      origemNome: origem?.nome ?? 'Origem',
      destinoNome: destino?.nome ?? 'Destino',
      quantidade,
      enviadoPor: responsavel,
      quantidadeIda: remessa.quantidade_enviada,
      observacao,
    }).catch((e) => console.error('[bag-email] error:', e));

    return { success: true, remessa_id: remessaId };
  } catch (err) {
    console.error('enviarVoltaAction error:', err);
    return { success: false, error: 'Erro ao registrar devolucao.' };
  }
}

export async function receberVoltaAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  if (!(await canSubmitTabletRecord())) {
    return { success: false, error: 'Acesso operacional expirado. Entre novamente.' };
  }

  const remessaId = formData.get('remessa_id') as string;
  const quantidade = parseInt(formData.get('quantidade_recebida') as string, 10);
  const responsavel = (formData.get('responsavel') as string)?.trim();
  const observacao = (formData.get('observacao') as string)?.trim() || undefined;

  if (!remessaId) return { success: false, error: 'Selecione uma remessa.' };
  if (isNaN(quantidade) || quantidade < 0) return { success: false, error: 'Informe a quantidade.' };
  if (!responsavel || responsavel.length < 2) return { success: false, error: 'Informe o responsavel.' };

  try {
    const remessa = await receberVolta({
      remessa_id: remessaId, qty_volta_recebida: quantidade,
      volta_recebido_por: responsavel, observacao_volta_recebimento: observacao,
    });

    const [origem, destino] = await Promise.all([getLocalById(remessa.origem_id), getLocalById(remessa.destino_id)]);
    sendVoltaRecebidaEmail({
      origemNome: origem?.nome ?? 'Origem',
      destinoNome: destino?.nome ?? 'Destino',
      quantidadeIda: remessa.quantidade_enviada,
      quantidadeIdaRecebida: remessa.quantidade_recebida ?? 0,
      quantidadeVoltaEnviada: remessa.qty_volta_enviada ?? 0,
      quantidadeVoltaRecebida: quantidade,
      recebidoPor: responsavel,
      observacao,
    }).catch((e) => console.error('[bag-email] error:', e));

    return { success: true, remessa_id: remessaId };
  } catch (err) {
    console.error('receberVoltaAction error:', err);
    return { success: false, error: 'Erro ao registrar recebimento da volta.' };
  }
}
