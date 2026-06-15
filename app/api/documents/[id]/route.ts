import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/access-control';
import { downloadPrivateBlob } from '@/lib/blob-storage';
import { getDownloadableFile } from '@/lib/supplier-documents';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const { id } = await context.params;
  const file = await getDownloadableFile(id);
  if (!file) {
    return Response.json({ error: 'Arquivo não encontrado.' }, { status: 404 });
  }

  const isOwner =
    hasPermission(session.user.role, 'supplier-documents:view-own') &&
    session.user.supplierId === file.supplier_id;
  const isReviewer = hasPermission(session.user.role, 'supplier-documents:review');
  if (!isOwner && !isReviewer) {
    return Response.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  try {
    const content = await downloadPrivateBlob(file.blob_key);
    const body = new Uint8Array(content.byteLength);
    body.set(content);
    const encodedName = encodeURIComponent(file.original_name);
    return new Response(body.buffer, {
      headers: {
        'Content-Type': file.mime_type,
        'Content-Length': String(content.byteLength),
        'Content-Disposition': `inline; filename*=UTF-8''${encodedName}`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Document download failed', error);
    return Response.json({ error: 'Não foi possível abrir o arquivo.' }, { status: 500 });
  }
}
