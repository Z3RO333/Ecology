import { describe, expect, it } from 'vitest';
import { sanitizeFileName, validatePdf, validateUploadBatch } from './document-upload';

const pdfBytes = new TextEncoder().encode('%PDF-1.7');

describe('document upload validation', () => {
  it('accepts a valid PDF', () => {
    expect(
      validatePdf({
        name: 'medicao.pdf',
        type: 'application/pdf',
        size: pdfBytes.length,
        bytes: pdfBytes,
      })
    ).toBeNull();
  });

  it('rejects a forged PDF', () => {
    expect(
      validatePdf({
        name: 'medicao.pdf',
        type: 'application/pdf',
        size: 8,
        bytes: new TextEncoder().encode('not-pdf!'),
      })
    ).toContain('assinatura');
  });

  it('rejects an empty batch and strips control characters', () => {
    expect(validateUploadBatch([])).toContain('entre 1 e');
    expect(sanitizeFileName(' fatura\u0000.pdf ')).toBe('fatura.pdf');
  });
});
