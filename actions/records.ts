'use server';

import { insertRecord } from '@/lib/databricks';
import { MATERIALS, SECTORS } from '@/lib/constants';
import { canSubmitTabletRecord } from '@/lib/tablet-access';
import type { Material, Sector } from '@/types';

interface ActionResult {
  success: boolean;
  error?: string;
  id?: string;
}

export async function createRecord(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  if (!(await canSubmitTabletRecord())) {
    return { success: false, error: 'Acesso operacional expirado. Entre novamente no tablet.' };
  }

  const material = formData.get('material_type') as Material;
  const weightRaw = formData.get('weight_kg') as string;
  const sector = formData.get('sector') as Sector;
  const responsible = (formData.get('responsible_name') as string)?.trim();
  const notes = (formData.get('notes') as string)?.trim() || undefined;

  if (!MATERIALS.includes(material)) {
    return { success: false, error: 'Selecione um tipo de material.' };
  }

  const weight_kg = parseFloat(weightRaw);
  if (isNaN(weight_kg) || weight_kg <= 0) {
    return { success: false, error: 'Informe um peso válido maior que zero.' };
  }

  if (!SECTORS.includes(sector)) {
    return { success: false, error: 'Selecione um setor.' };
  }

  if (!responsible || responsible.length < 2) {
    return { success: false, error: 'Informe o nome do responsável.' };
  }

  try {
    const id = await insertRecord({ material_type: material, weight_kg, sector, responsible_name: responsible, notes });
    return { success: true, id };
  } catch (err) {
    console.error('Databricks insert error:', err);
    return { success: false, error: 'Erro ao salvar. Tente novamente.' };
  }
}
