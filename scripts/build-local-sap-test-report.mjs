import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

function parseBrazilianNumber(value) {
  return Number(value.replace(/\./g, '').replace(',', '.'));
}

function pick(text, expression) {
  return text.match(expression)?.[1]?.trim() ?? null;
}

function parseDocument(document) {
  const text = document.text.replace(/\s+/g, ' ');
  const total = parseBrazilianNumber(pick(text, /Total \(R\$\):\s*R\$([\d.,]+)/i));
  const closing = pick(text, /Fechada em:\s*(.*?)\s+Vencimento:/i);
  const dueDate = pick(text, /Vencimento:\s*(.*?)\s+Total \(R\$\):/i);
  const orderIds = [
    ...new Set(
      [...text.matchAll(/Pedido\s+([0-9]{2}\.[0-9]{2}\.[0-9]{2}\.[A-Z0-9]+)/g)].map(
        (match) => match[1]
      )
    ),
  ];

  const field = (value, confidence, evidence) => ({ value, confidence, evidence });
  const closedDate = closing === 'Aguard. fechamento' ? null : closing;
  const normalizedDueDate = dueDate === 'Aguard. fechamento' ? null : dueDate;

  return {
    filename: document.filename,
    pages: document.total_pages,
    text_characters: document.text_characters,
    extraction_source: document.extraction_source,
    document_type: 'fatura_de_bens_moveis',
    classification_confidence: 1,
    supplier: field(
      'SA Entulho',
      0.92,
      'Identificação SA no nome do arquivo e domínio saentulho.com.br no cabeçalho.'
    ),
    supplier_cnpj: field(
      pick(text, /CNPJ:\s*([\d./-]+)/i),
      1,
      'CNPJ exibido no cabeçalho da fatura.'
    ),
    responsible: field(
      null,
      0,
      'O nome Wander consta apenas no nome do ZIP/e-mail, não dentro deste PDF.'
    ),
    competence: field(
      '2026-05',
      0.98,
      'Competência indicada no ZIP e repetida nos identificadores 26.05 dos pedidos/fatura.'
    ),
    measurement_number: field(
      null,
      0,
      'Não existe um número único de medição explícito; há números individuais de fatura e pedido.'
    ),
    invoice_number: field(
      pick(text, /FATURA DE BENS.*?([0-9]{2}\.[0-9]{2}\.[0-9]{2}\.[A-Z0-9]+)/i),
      1,
      'Número após o título FATURA DE BENS MÓVEIS.'
    ),
    fiscal_document_type: field(
      'recibo/fatura de bens móveis, não NFS-e',
      1,
      'O rodapé informa não incidência de ISS e emissão de recibo em substituição à NFS-e.'
    ),
    closing_date: field(
      closedDate,
      closedDate ? 1 : 0,
      closedDate ? 'Data exibida em Fechada em.' : 'Documento informa Aguard. fechamento.'
    ),
    due_date: field(
      normalizedDueDate,
      normalizedDueDate ? 1 : 0,
      normalizedDueDate
        ? 'Data exibida em Vencimento.'
        : 'Documento informa Aguard. fechamento.'
    ),
    gross_amount_brl: field(total, 1, 'Total (R$) no cabeçalho e Valor Total da Fatura.'),
    net_amount_brl: field(
      total,
      0.98,
      'Desconto da fatura é R$ 0,00 e não há retenções monetárias discriminadas.'
    ),
    discount_brl: field(0, 1, 'Desconto da Fatura R$ 0,00.'),
    taxes_and_withholdings: [],
    tax_note: field(
      'Não incidência de ISS para locação de bens móveis, conforme texto do documento.',
      1,
      'Rodapé tributário presente em todas as faturas.'
    ),
    service_description: field(
      'Locação/coleta de caçambas e cobrança de itens por peso.',
      0.98,
      'Itens incluem caçambas de 5, 10 ou 36 m³ e PESO DA CAIXA a R$ 0,39.'
    ),
    business_unit: field(
      pick(text, /Cliente:\s*(.*?)\s+CPF\/CNPJ:/i),
      1,
      'Campo Cliente no cabeçalho.'
    ),
    customer_cnpj: field(
      pick(text, /CPF\/CNPJ:\s*([\d./-]+)/i),
      1,
      'CPF/CNPJ do cliente no cabeçalho.'
    ),
    cost_center: field(null, 0, 'Centro de custo não aparece no PDF.'),
    linked_orders: field(
      orderIds,
      0.88,
      'Identificadores rotulados como Pedido; precisam ser mapeados ao conceito de OS/pedido do SAP.'
    ),
    payment_method: field('Boleto', 1, 'Campo Forma Pag.: Boleto.'),
    boleto_attached: field(
      false,
      1,
      'O ZIP contém somente as nove faturas; não há arquivo separado de boleto.'
    ),
    dumpster_quantity: field(
      Number((pick(text, /Qtd Ca[^\d]*([\d.,]+)/i) ?? '0').replace(',', '.')),
      1,
      'Resumo CÁLCULOS, campo Qtd Caçambas.'
    ),
    dumpster_amount_brl: field(
      parseBrazilianNumber(pick(text, /Valor Ca[^R]*R\$\s*([\d.,]+)/i) ?? '0'),
      1,
      'Resumo CÁLCULOS, campo Valor Caçambas.'
    ),
    measured_weight_kg: field(
      parseBrazilianNumber(pick(text, /Qtd Itens Simples\s*([\d.,]+)/i) ?? '0'),
      0.94,
      'Resumo CÁLCULOS; os itens detalhados identificam essas quantidades como peso de caixa.'
    ),
    weight_amount_brl: field(
      parseBrazilianNumber(pick(text, /Valor Itens Simples\s*R\$\s*([\d.,]+)/i) ?? '0'),
      1,
      'Resumo CÁLCULOS, campo Valor Itens Simples.'
    ),
  };
}

async function main() {
  const inputFile = process.argv[2];
  const outputFile = process.argv[3];
  if (!inputFile || !outputFile) {
    throw new Error('Uso: node scripts/build-local-sap-test-report.mjs <textos.json> <saida.json>');
  }

  const source = JSON.parse(await readFile(inputFile, 'utf8'));
  const documents = source.documents.map(parseDocument);
  const sum = (selector) => documents.reduce((total, document) => total + selector(document), 0);

  const report = {
    test_status: 'partial_success_openai_quota_blocked',
    sap_write_performed: false,
    database_write_performed: false,
    openai_test: {
      attempted: true,
      model: 'gpt-4.1-mini',
      result: 'blocked',
      http_status: 429,
      reason: 'OpenAI API quota/billing exceeded.',
    },
    package: {
      source_zip: 'ENC_ Medição 05_2026 Bemol - Responsável_ Wander.zip',
      supplier: {
        value: 'SA Entulho',
        confidence: 0.92,
        evidence: 'Nomes dos arquivos, e-mail comercial e domínio saentulho.com.br.',
      },
      supplier_cnpj: {
        value: '27.827.934/0001-58',
        confidence: 1,
        evidence: 'Mesmo CNPJ no cabeçalho dos nove PDFs.',
      },
      responsible: {
        value: 'Wander',
        confidence: 0.7,
        evidence: 'Somente no nome do ZIP/e-mail; ausente nos PDFs.',
      },
      competence: {
        value: '2026-05',
        confidence: 0.98,
        evidence: 'Nome do ZIP e identificadores 26.05 nos documentos.',
      },
      measurement_number: {
        value: null,
        confidence: 0,
        evidence: 'Não há identificador único de medição no pacote.',
      },
      document_count: documents.length,
      total_pages: sum((document) => document.pages),
      linked_order_count: sum((document) => document.linked_orders.value.length),
      dumpster_quantity: sum((document) => document.dumpster_quantity.value),
      measured_weight_kg: sum((document) => document.measured_weight_kg.value),
      gross_total_brl: sum((document) => document.gross_amount_brl.value),
      net_total_brl: sum((document) => document.net_amount_brl.value),
      discount_total_brl: sum((document) => document.discount_brl.value),
      taxes_and_withholdings_total_brl: 0,
      service_description: 'Locação/coleta de caçambas e cobrança por peso coletado.',
    },
    documents,
    fields_safe_for_sap_after_master_data_mapping: [
      'Fornecedor CNPJ 27.827.934/0001-58',
      'Competência 2026-05',
      'Números individuais das nove faturas',
      'Valores individuais e total consolidado de R$ 38.603,95',
      'Unidades atendidas e respectivos CNPJs',
      'Forma de pagamento indicada como boleto',
      'Quantidades de caçambas e pesos por unidade',
    ],
    manual_validation_required: [
      'Confirmar a razão social/código SAP do fornecedor a partir do CNPJ.',
      'Confirmar Wander como responsável, pois o nome aparece apenas no ZIP/e-mail.',
      'Definir ou gerar número único da medição.',
      'Mapear cada unidade/CNPJ para centro de custo, empresa, filial e código SAP.',
      'Definir se os identificadores Pedido das faturas correspondem a OS, pedido interno ou referência externa.',
      'Validar o tipo de documento SAP: os PDFs não são NFS-e; declaram recibo/fatura de bens móveis sem incidência de ISS.',
      'Confirmar datas de lançamento e vencimento de sete faturas ainda marcadas como Aguard. fechamento.',
      'Solicitar ou localizar os boletos; o ZIP só menciona a forma de pagamento e não contém boleto anexado.',
      'Validar regras fiscais e retenções no cadastro fiscal; ausência de valores no PDF não substitui validação tributária.',
    ],
    missing_required_fields: [
      'Número único da medição',
      'Centro de custo/código SAP por unidade',
      'Código SAP do fornecedor',
      'Tipo de pedido e organização de compras',
      'Datas de fechamento e vencimento para sete faturas',
      'Arquivo do boleto',
    ],
    low_confidence_fields: [
      {
        field: 'responsável',
        value: 'Wander',
        confidence: 0.7,
        reason: 'Presente apenas no metadado do ZIP/e-mail.',
      },
      {
        field: 'razão social do fornecedor',
        value: 'SA Entulho',
        confidence: 0.92,
        reason: 'Nome inferido pelo domínio e arquivos; o cabeçalho destaca o CNPJ, não a razão social completa.',
      },
      {
        field: 'vínculo dos identificadores Pedido com OS/pedido SAP',
        value: null,
        confidence: 0.5,
        reason: 'Os PDFs não explicam a semântica desses identificadores no SAP.',
      },
    ],
    user_summary:
      'Foram lidas nove faturas textuais da SA Entulho para maio de 2026, totalizando R$ 38.603,95. Os documentos cobrem nove unidades, 43 caçambas e 41.805 kg. Não há nota fiscal, boleto separado, centro de custo nem número único de medição. Antes de criar pedidos no SAP, é necessário mapear cadastros mestres e validar o tratamento fiscal como recibo/fatura de bens móveis.',
  };

  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`Relatório consolidado salvo em ${path.resolve(outputFile)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
