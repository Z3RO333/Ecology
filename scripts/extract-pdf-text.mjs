import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { extractText, getDocumentProxy } from 'unpdf';

async function main() {
  const inputDirectory = process.argv[2];
  const outputFile = process.argv[3];
  if (!inputDirectory || !outputFile) {
    throw new Error('Uso: node scripts/extract-pdf-text.mjs <diretorio> <saida.json>');
  }

  const fileNames = (await readdir(inputDirectory))
    .filter((name) => name.toLowerCase().endsWith('.pdf'))
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const documents = [];
  for (const filename of fileNames) {
    const buffer = await readFile(path.join(inputDirectory, filename));
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const extracted = await extractText(pdf, { mergePages: true });
    const text = Array.isArray(extracted.text) ? extracted.text.join('\n') : extracted.text;

    documents.push({
      filename,
      bytes: buffer.length,
      total_pages: extracted.totalPages,
      text_characters: text.length,
      extraction_source: text.trim().length >= 100 ? 'embedded_text' : 'ocr_required',
      text,
    });
  }

  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(
    outputFile,
    `${JSON.stringify(
      {
        extracted_at: new Date().toISOString(),
        documents,
      },
      null,
      2
    )}\n`,
    'utf8'
  );

  console.log(`Textos extraídos: ${documents.length}`);
  for (const document of documents) {
    console.log(
      `${document.filename}: ${document.total_pages} página(s), ${document.text_characters} caracteres, ${document.extraction_source}`
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
