import 'server-only';

import sg from '@sendgrid/mail';
import { readFile } from 'fs/promises';
import { join } from 'path';
import type { AttachmentData } from '@sendgrid/helpers/classes/attachment';
import { sql } from '@/lib/db';

const FROM = { email: 'ordensmanutencao@bemol.com.br', name: 'EcoTracker Bags' };
const LOGO_CID = 'ecotracker-logo';

const BLUE = '#0b3f8e';
const INK = '#0f172a';
const MUTED = '#64748b';
const BORDER = '#dbe7f5';
const SURFACE = '#f6f9fd';
const ORANGE = '#ea580c';
const GREEN = '#16a34a';
const RED = '#dc2626';

let configured = false;
let logoPromise: Promise<AttachmentData | null> | null = null;

function client() {
  if (!configured) {
    const key = process.env.SENDGRID_API_KEY?.trim();
    if (!key) throw new Error('SENDGRID_API_KEY nao configurada.');
    sg.setApiKey(key);
    configured = true;
  }
  return sg;
}

function getLogo(): Promise<AttachmentData | null> {
  if (!logoPromise) {
    logoPromise = readFile(join(process.cwd(), 'public', 'assets', 'bemol-manutencao-logo.png'))
      .then((png) => ({
        content: Buffer.from(png).toString('base64'),
        filename: 'bemol-manutencao-logo.png',
        type: 'image/png',
        disposition: 'inline' as const,
        content_id: LOGO_CID,
      }) as unknown as AttachmentData)
      .catch(() => null);
  }
  return logoPromise;
}

function esc(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function shell(body: string): string {
  return `
  <div style="margin:0;padding:0;background:${SURFACE};">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:${SURFACE};">
      <tr><td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:600px;max-width:600px;border-collapse:collapse;font-family:Arial,sans-serif;color:${INK};">
          ${body}
          <tr><td style="padding:20px 28px;text-align:center;font-size:11px;color:${MUTED};">
            EcoTracker &mdash; Plataforma de Reciclagem e Rastreabilidade<br>Bemol Manutencao
          </td></tr>
        </table>
      </td></tr>
    </table>
  </div>`;
}

function row(label: string, value: string, highlight?: string): string {
  const style = highlight ? `font-weight:700;color:${highlight};` : '';
  return `<tr>
    <td style="padding:10px 14px;border-bottom:1px solid ${BORDER};font-size:13px;color:${MUTED};white-space:nowrap;vertical-align:top;">${esc(label)}</td>
    <td style="padding:10px 14px;border-bottom:1px solid ${BORDER};font-size:14px;${style}">${value}</td>
  </tr>`;
}

function step(icon: string, color: string, title: string, detail: string, isLast: boolean): string {
  const line = isLast ? '' : `<div style="width:2px;height:24px;background:${BORDER};margin:4px auto;"></div>`;
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
      <tr>
        <td style="width:40px;vertical-align:top;text-align:center;padding-top:2px;">
          <div style="width:28px;height:28px;border-radius:50%;background:${color};color:#fff;font-size:14px;line-height:28px;text-align:center;margin:0 auto;">${icon}</div>
          ${line}
        </td>
        <td style="padding:0 0 0 8px;vertical-align:top;">
          <div style="font-size:14px;font-weight:700;color:${INK};">${title}</div>
          <div style="font-size:12px;color:${MUTED};margin-top:2px;">${detail}</div>
        </td>
      </tr>
    </table>`;
}

async function getEmailsForLocal(localId: string): Promise<string[]> {
  const rows = await sql<{ email: string }>(
    'SELECT email::text FROM local_emails WHERE local_id = $1',
    [localId]
  );
  return rows.map((r) => r.email);
}

export async function sendRemessaEnviadaEmail(input: {
  origemNome: string;
  origemId: string;
  destinoNome: string;
  destinoId: string;
  quantidade: number;
  enviadoPor: string;
  observacao?: string;
}): Promise<void> {
  const now = new Date();
  const dataHora = now.toLocaleString('pt-BR', { timeZone: 'America/Manaus' });
  const logo = await getLogo();
  const logoSrc = logo ? `cid:${LOGO_CID}` : '';

  const html = shell(`
    <tr><td style="background:${ORANGE};border-radius:14px 14px 0 0;padding:24px 28px;color:#ffffff;">
      ${logoSrc ? `<img src="${logoSrc}" alt="EcoTracker" style="width:120px;margin-bottom:12px;" />` : ''}
      <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.85;">Rastreamento de Bags</div>
      <div style="font-size:26px;font-weight:800;margin-top:4px;">${esc(String(input.quantidade))} bags enviadas</div>
      <div style="font-size:13px;margin-top:6px;opacity:.9;">${esc(dataHora)}</div>
    </td></tr>
    <tr><td style="background:#ffffff;padding:24px;border-radius:0 0 14px 14px;">
      <div style="margin-bottom:20px;">
        ${step('&#10148;', ORANGE, `Enviado de ${esc(input.origemNome)}`, `${esc(dataHora)} &middot; por ${esc(input.enviadoPor)}`, false)}
        ${step('&#9711;', '#cbd5e1', `Aguardando recebimento em ${esc(input.destinoNome)}`, 'Pendente', true)}
      </div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-top:16px;">
        ${row('Quantidade', `<strong>${input.quantidade} bags</strong>`)}
        ${row('Origem', esc(input.origemNome))}
        ${row('Destino', esc(input.destinoNome))}
        ${row('Responsavel', esc(input.enviadoPor))}
        ${row('Data/Hora', esc(dataHora))}
        ${input.observacao ? row('Observacao', esc(input.observacao)) : ''}
      </table>
      <div style="margin-top:20px;padding:14px;background:${SURFACE};border:1px solid ${BORDER};border-radius:8px;text-align:center;">
        <div style="font-size:12px;color:${MUTED};">As bags estao a caminho. Confirme o recebimento no sistema ao chegar.</div>
      </div>
    </td></tr>`);

  const todos = ['ordensmanutencao@bemol.com.br'];

  try {
    await client().send({
      from: FROM,
      to: todos,
      subject: `[EcoTracker] ${input.quantidade} bags enviadas: ${input.origemNome} → ${input.destinoNome}`,
      html,
      attachments: logo ? [logo] : undefined,
    });
  } catch (e) {
    console.error('[bag-email] erro ao enviar notificacao de envio:', e);
  }
}

export async function sendRemessaRecebidaEmail(input: {
  origemNome: string;
  origemId: string;
  destinoNome: string;
  destinoId: string;
  quantidadeEnviada: number;
  quantidadeRecebida: number;
  enviadoPor: string;
  recebidoPor: string;
  enviadoEm: string;
  observacao?: string;
}): Promise<void> {
  const now = new Date();
  const dataHora = now.toLocaleString('pt-BR', { timeZone: 'America/Manaus' });
  const logo = await getLogo();
  const logoSrc = logo ? `cid:${LOGO_CID}` : '';

  const perdidas = input.quantidadeEnviada - input.quantidadeRecebida;
  const temDivergencia = perdidas > 0;
  const headerColor = temDivergencia ? RED : GREEN;
  const statusLabel = temDivergencia ? `DIVERGENCIA: ${perdidas} bags faltando` : 'Recebimento completo';
  const statusIcon = temDivergencia ? '&#9888;' : '&#10004;';

  const html = shell(`
    <tr><td style="background:${headerColor};border-radius:14px 14px 0 0;padding:24px 28px;color:#ffffff;">
      ${logoSrc ? `<img src="${logoSrc}" alt="EcoTracker" style="width:120px;margin-bottom:12px;" />` : ''}
      <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.85;">Rastreamento de Bags</div>
      <div style="font-size:26px;font-weight:800;margin-top:4px;">${statusIcon} ${esc(statusLabel)}</div>
      <div style="font-size:13px;margin-top:6px;opacity:.9;">${esc(dataHora)}</div>
    </td></tr>
    <tr><td style="background:#ffffff;padding:24px;border-radius:0 0 14px 14px;">
      <div style="margin-bottom:20px;">
        ${step('&#10004;', GREEN, `Enviado de ${esc(input.origemNome)}`, `${esc(input.enviadoEm)} &middot; por ${esc(input.enviadoPor)}`, false)}
        ${step('&#10004;', temDivergencia ? RED : GREEN, `Recebido em ${esc(input.destinoNome)}`, `${esc(dataHora)} &middot; por ${esc(input.recebidoPor)}`, true)}
      </div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-top:16px;">
        ${row('Bags enviadas', `<strong>${input.quantidadeEnviada}</strong>`)}
        ${row('Bags recebidas', `<strong>${input.quantidadeRecebida}</strong>`, temDivergencia ? RED : GREEN)}
        ${temDivergencia ? row('Bags perdidas', `<strong>${perdidas}</strong>`, RED) : ''}
        ${row('Origem', esc(input.origemNome))}
        ${row('Destino', esc(input.destinoNome))}
        ${row('Recebido por', esc(input.recebidoPor))}
        ${input.observacao ? row('Observacao', esc(input.observacao)) : ''}
      </table>
      ${temDivergencia ? `
      <div style="margin-top:20px;padding:14px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;text-align:center;">
        <div style="font-size:14px;font-weight:700;color:${RED};">&#9888; Atencao: ${perdidas} bags nao foram recebidas.</div>
        <div style="font-size:12px;color:${MUTED};margin-top:4px;">Verifique com a origem e registre a ocorrencia.</div>
      </div>` : `
      <div style="margin-top:20px;padding:14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;text-align:center;">
        <div style="font-size:14px;font-weight:700;color:${GREEN};">&#10004; Todas as bags foram recebidas com sucesso.</div>
      </div>`}
    </td></tr>`);

  const todos = ['ordensmanutencao@bemol.com.br'];

  const assuntoPrefix = temDivergencia ? '[DIVERGENCIA]' : '[RECEBIDO]';

  try {
    await client().send({
      from: FROM,
      to: todos,
      subject: `${assuntoPrefix} ${input.quantidadeRecebida}/${input.quantidadeEnviada} bags: ${input.origemNome} → ${input.destinoNome}`,
      html,
      attachments: logo ? [logo] : undefined,
    });
  } catch (e) {
    console.error('[bag-email] erro ao enviar notificacao de recebimento:', e);
  }
}

const PURPLE = '#9333ea';
const TEAL = '#0d9488';

export async function sendDevolucaoEnviadaEmail(input: {
  origemNome: string;
  destinoNome: string;
  quantidade: number;
  enviadoPor: string;
  quantidadeIda: number;
  observacao?: string;
}): Promise<void> {
  const now = new Date();
  const dataHora = now.toLocaleString('pt-BR', { timeZone: 'America/Manaus' });
  const logo = await getLogo();
  const logoSrc = logo ? `cid:${LOGO_CID}` : '';

  const html = shell(`
    <tr><td style="background:${PURPLE};border-radius:14px 14px 0 0;padding:24px 28px;color:#ffffff;">
      ${logoSrc ? `<img src="${logoSrc}" alt="EcoTracker" style="width:120px;margin-bottom:12px;" />` : ''}
      <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.85;">Rastreamento de Bags</div>
      <div style="font-size:26px;font-weight:800;margin-top:4px;">&#128257; ${input.quantidade} bags devolvidas</div>
      <div style="font-size:13px;margin-top:6px;opacity:.9;">${esc(dataHora)}</div>
    </td></tr>
    <tr><td style="background:#ffffff;padding:24px;border-radius:0 0 14px 14px;">
      <div style="margin-bottom:20px;">
        ${step('&#10004;', ORANGE, 'Ida: Enviado', `${esc(input.origemNome)} &rarr; ${esc(input.destinoNome)}`, false)}
        ${step('&#10004;', GREEN, 'Ida: Recebido', `${input.quantidadeIda} bags`, false)}
        ${step('&#10148;', PURPLE, `Devolvido de ${esc(input.destinoNome)}`, `${esc(dataHora)} &middot; por ${esc(input.enviadoPor)}`, false)}
        ${step('&#9711;', '#cbd5e1', `Aguardando recebimento em ${esc(input.origemNome)}`, 'Pendente', true)}
      </div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-top:16px;">
        ${row('Bags devolvidas', `<strong>${input.quantidade}</strong>`)}
        ${row('De', esc(input.destinoNome))}
        ${row('Para', esc(input.origemNome))}
        ${row('Responsavel', esc(input.enviadoPor))}
        ${input.observacao ? row('Observacao', esc(input.observacao)) : ''}
      </table>
      <div style="margin-top:20px;padding:14px;background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;text-align:center;">
        <div style="font-size:12px;color:${MUTED};">As bags estao retornando. Confirme o recebimento no sistema.</div>
      </div>
    </td></tr>`);

  const todos = ['ordensmanutencao@bemol.com.br'];

  try {
    await client().send({
      from: FROM,
      to: todos,
      subject: `[DEVOLUCAO] ${input.quantidade} bags: ${input.destinoNome} → ${input.origemNome}`,
      html,
      attachments: logo ? [logo] : undefined,
    });
  } catch (e) {
    console.error('[bag-email] erro ao enviar notificacao de devolucao:', e);
  }
}

export async function sendVoltaRecebidaEmail(input: {
  origemNome: string;
  destinoNome: string;
  quantidadeIda: number;
  quantidadeIdaRecebida: number;
  quantidadeVoltaEnviada: number;
  quantidadeVoltaRecebida: number;
  recebidoPor: string;
  observacao?: string;
}): Promise<void> {
  const now = new Date();
  const dataHora = now.toLocaleString('pt-BR', { timeZone: 'America/Manaus' });
  const logo = await getLogo();
  const logoSrc = logo ? `cid:${LOGO_CID}` : '';

  const perdidasVolta = input.quantidadeVoltaEnviada - input.quantidadeVoltaRecebida;
  const perdidasTotal = input.quantidadeIda - input.quantidadeVoltaRecebida;
  const temDivergencia = perdidasVolta > 0;
  const headerColor = temDivergencia ? RED : TEAL;
  const statusLabel = temDivergencia
    ? `DIVERGENCIA NA VOLTA: ${perdidasVolta} bags faltando`
    : 'Ciclo concluido com sucesso';
  const statusIcon = temDivergencia ? '&#9888;' : '&#10004;';

  const html = shell(`
    <tr><td style="background:${headerColor};border-radius:14px 14px 0 0;padding:24px 28px;color:#ffffff;">
      ${logoSrc ? `<img src="${logoSrc}" alt="EcoTracker" style="width:120px;margin-bottom:12px;" />` : ''}
      <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.85;">Rastreamento de Bags</div>
      <div style="font-size:26px;font-weight:800;margin-top:4px;">${statusIcon} ${esc(statusLabel)}</div>
      <div style="font-size:13px;margin-top:6px;opacity:.9;">${esc(dataHora)}</div>
    </td></tr>
    <tr><td style="background:#ffffff;padding:24px;border-radius:0 0 14px 14px;">
      <div style="margin-bottom:20px;">
        ${step('&#10004;', ORANGE, 'Ida: Enviado', `${esc(input.origemNome)} &rarr; ${esc(input.destinoNome)} &middot; ${input.quantidadeIda} bags`, false)}
        ${step('&#10004;', GREEN, 'Ida: Recebido', `${input.quantidadeIdaRecebida} bags`, false)}
        ${step('&#10004;', PURPLE, 'Volta: Devolvido', `${input.quantidadeVoltaEnviada} bags`, false)}
        ${step('&#10004;', temDivergencia ? RED : TEAL, `Volta: Recebido em ${esc(input.origemNome)}`, `${esc(dataHora)} &middot; por ${esc(input.recebidoPor)} &middot; ${input.quantidadeVoltaRecebida} bags`, true)}
      </div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-top:16px;">
        ${row('Bags enviadas (ida)', `<strong>${input.quantidadeIda}</strong>`)}
        ${row('Bags recebidas (ida)', `<strong>${input.quantidadeIdaRecebida}</strong>`)}
        ${row('Bags devolvidas (volta)', `<strong>${input.quantidadeVoltaEnviada}</strong>`)}
        ${row('Bags recebidas (volta)', `<strong>${input.quantidadeVoltaRecebida}</strong>`, temDivergencia ? RED : TEAL)}
        ${perdidasTotal > 0 ? row('Total perdidas no ciclo', `<strong>${perdidasTotal}</strong>`, RED) : ''}
        ${row('Recebido por', esc(input.recebidoPor))}
        ${input.observacao ? row('Observacao', esc(input.observacao)) : ''}
      </table>
      ${temDivergencia ? `
      <div style="margin-top:20px;padding:14px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;text-align:center;">
        <div style="font-size:14px;font-weight:700;color:${RED};">&#9888; ${perdidasVolta} bags nao retornaram na volta.</div>
      </div>` : `
      <div style="margin-top:20px;padding:14px;background:#f0fdfa;border:1px solid #99f6e4;border-radius:8px;text-align:center;">
        <div style="font-size:14px;font-weight:700;color:${TEAL};">&#10004; Ciclo completo! Todas as bags retornaram.</div>
      </div>`}
    </td></tr>`);

  const todos = ['ordensmanutencao@bemol.com.br'];
  const assuntoPrefix = temDivergencia ? '[DIVERGENCIA VOLTA]' : '[CICLO CONCLUIDO]';

  try {
    await client().send({
      from: FROM,
      to: todos,
      subject: `${assuntoPrefix} ${input.quantidadeVoltaRecebida}/${input.quantidadeVoltaEnviada} bags: ${input.destinoNome} → ${input.origemNome}`,
      html,
      attachments: logo ? [logo] : undefined,
    });
  } catch (e) {
    console.error('[bag-email] erro ao enviar notificacao de volta recebida:', e);
  }
}
