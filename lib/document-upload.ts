export const MAX_FILE_BYTES = 15 * 1024 * 1024;
export const MAX_FILES = 20;
export const MAX_SUBMISSION_BYTES = 100 * 1024 * 1024;

export interface UploadCandidate {
  name: string;
  type: string;
  size: number;
  bytes: Uint8Array;
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 255) || 'documento.pdf';
}

export function validatePdf(candidate: UploadCandidate): string | null {
  if (!candidate.name.toLowerCase().endsWith('.pdf')) {
    return `${candidate.name}: somente arquivos PDF são permitidos.`;
  }
  if (candidate.type !== 'application/pdf') {
    return `${candidate.name}: o tipo do arquivo não é PDF.`;
  }
  if (candidate.size <= 0 || candidate.size > MAX_FILE_BYTES) {
    return `${candidate.name}: o arquivo deve ter no máximo 15 MB.`;
  }

  const signature = String.fromCharCode(...candidate.bytes.slice(0, 5));
  if (signature !== '%PDF-') {
    return `${candidate.name}: assinatura de PDF inválida.`;
  }
  return null;
}

export function validateUploadBatch(candidates: UploadCandidate[]): string | null {
  if (candidates.length < 1 || candidates.length > MAX_FILES) {
    return `Envie entre 1 e ${MAX_FILES} arquivos.`;
  }
  if (candidates.reduce((total, file) => total + file.size, 0) > MAX_SUBMISSION_BYTES) {
    return 'O envio completo deve ter no máximo 100 MB.';
  }
  for (const candidate of candidates) {
    const error = validatePdf(candidate);
    if (error) return error;
  }
  return null;
}
