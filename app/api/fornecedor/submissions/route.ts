import { createHash } from 'node:crypto';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/access-control';
import { deletePrivateBlob, uploadPrivateBlob } from '@/lib/blob-storage';
import {
  sanitizeFileName,
  validateUploadBatch,
  type UploadCandidate,
} from '@/lib/document-upload';
import {
  createSubmissionIds,
  createSupplierSubmission,
  type SubmissionFileInput,
} from '@/lib/supplier-documents';

function parseCompetence(value: string): { start: string; end: string } | null {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return null;
  const [year, month] = value.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    start: `${value}-01`,
    end: `${value}-${String(lastDay).padStart(2, '0')}`,
  };
}

export async function POST(request: Request) {
  const session = await auth();
  const supplierId = session?.user?.supplierId;
  const email = session?.user?.email;
  if (
    !supplierId ||
    !email ||
    !hasPermission(session.user.role, 'supplier-documents:submit')
  ) {
    return Response.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const form = await request.formData();
  const competence = parseCompetence(String(form.get('competence') ?? ''));
  const responsibleName = String(form.get('responsible_name') ?? '').trim();
  const notes = String(form.get('notes') ?? '').trim().slice(0, 2000) || null;
  const files = form.getAll('files').filter((value): value is File => value instanceof File);

  if (!competence) {
    return Response.json({ error: 'Informe uma competência válida.' }, { status: 400 });
  }
  if (responsibleName.length < 2 || responsibleName.length > 150) {
    return Response.json({ error: 'Informe o responsável pelo envio.' }, { status: 400 });
  }

  const buffers = await Promise.all(files.map(async (file) => Buffer.from(await file.arrayBuffer())));
  const candidates: UploadCandidate[] = files.map((file, index) => ({
    name: file.name,
    type: file.type,
    size: file.size,
    bytes: buffers[index],
  }));
  const validationError = validateUploadBatch(candidates);
  if (validationError) {
    return Response.json({ error: validationError }, { status: 400 });
  }

  const { submissionId, fileIds, blobKeys } = createSubmissionIds(supplierId, files.length);
  const uploadedBlobKeys: string[] = [];

  try {
    const metadata: SubmissionFileInput[] = [];
    for (const [index, file] of files.entries()) {
      await uploadPrivateBlob(blobKeys[index], buffers[index], 'application/pdf');
      uploadedBlobKeys.push(blobKeys[index]);
      metadata.push({
        id: fileIds[index],
        originalName: sanitizeFileName(file.name),
        blobKey: blobKeys[index],
        mimeType: 'application/pdf',
        sizeBytes: file.size,
        sha256: createHash('sha256').update(buffers[index]).digest('hex'),
      });
    }

    const forwardedFor = request.headers.get('x-forwarded-for');
    const result = await createSupplierSubmission({
      id: submissionId,
      supplierId,
      submittedByEmail: email,
      responsibleName,
      competenceStart: competence.start,
      competenceEnd: competence.end,
      notes,
      sourceIp: forwardedFor?.split(',')[0]?.trim() || null,
      sourceUserAgent: request.headers.get('user-agent'),
      files: metadata,
    });
    return Response.json(result, { status: 201 });
  } catch (error) {
    await Promise.allSettled(uploadedBlobKeys.map((blobKey) => deletePrivateBlob(blobKey)));
    console.error('Supplier submission upload failed', error);
    return Response.json(
      { error: 'Não foi possível concluir o envio. Tente novamente.' },
      { status: 500 }
    );
  }
}
