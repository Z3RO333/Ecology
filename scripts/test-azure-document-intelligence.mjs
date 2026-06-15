import { readFile } from 'node:fs/promises';
import path from 'node:path';

function loadEnv(contents) {
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

async function waitForResult(operationUrl, apiKey) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const response = await fetch(operationUrl, {
      headers: { 'Ocp-Apim-Subscription-Key': apiKey },
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        `Azure OCR ${response.status}: ${result?.error?.message || JSON.stringify(result)}`
      );
    }
    if (result.status === 'succeeded') return result;
    if (result.status === 'failed') {
      throw new Error(`Azure OCR falhou: ${JSON.stringify(result.error)}`);
    }
  }
  throw new Error('Azure OCR excedeu o tempo de espera.');
}

async function main() {
  const inputFile = process.argv[2];
  const outputFile = process.argv[3];
  if (!inputFile || !outputFile) {
    throw new Error(
      'Uso: node scripts/test-azure-document-intelligence.mjs <arquivo.pdf> <saida.json>'
    );
  }

  loadEnv(await readFile(path.resolve('.env'), 'utf8'));
  const endpoint = process.env.AZURE_OCR_ENDPOINT?.replace(/\/+$/, '');
  const apiKey = process.env.AZURE_OCR_DOCUMENT;
  if (!endpoint || !apiKey) {
    throw new Error('AZURE_OCR_ENDPOINT ou AZURE_OCR_DOCUMENT não configurada.');
  }

  const analyzeUrl =
    `${endpoint}/documentintelligence/documentModels/prebuilt-layout:analyze` +
    '?api-version=2024-11-30';
  const response = await fetch(analyzeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/pdf',
      'Ocp-Apim-Subscription-Key': apiKey,
    },
    body: await readFile(inputFile),
  });

  if (response.status !== 202) {
    const error = await response.text();
    throw new Error(`Azure OCR ${response.status}: ${error}`);
  }

  const operationUrl = response.headers.get('operation-location');
  if (!operationUrl) throw new Error('Azure OCR não retornou operation-location.');

  const result = await waitForResult(operationUrl, apiKey);
  const compactResult = {
    status: result.status,
    model_id: result.analyzeResult?.modelId ?? null,
    api_version: result.analyzeResult?.apiVersion ?? null,
    pages: result.analyzeResult?.pages?.length ?? 0,
    content_characters: result.analyzeResult?.content?.length ?? 0,
    content: result.analyzeResult?.content ?? '',
    content_preview: result.analyzeResult?.content?.slice(0, 800) ?? '',
  };

  await import('node:fs/promises').then(({ mkdir, writeFile }) =>
    mkdir(path.dirname(outputFile), { recursive: true }).then(() =>
      writeFile(outputFile, `${JSON.stringify(compactResult, null, 2)}\n`, 'utf8')
    )
  );
  console.log(JSON.stringify(compactResult, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
