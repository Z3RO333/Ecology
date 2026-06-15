import 'server-only';

import { randomBytes, randomUUID } from 'node:crypto';
import type { PoolClient, QueryResultRow } from 'pg';
import { sql, sqlOne, withTransaction } from '@/lib/db';

export const SUBMISSION_STATUSES = [
  'draft',
  'submitted',
  'under_review',
  'correction_requested',
  'approved',
  'rejected',
  'archived',
] as const;

export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export interface SubmissionFileInput {
  id: string;
  originalName: string;
  blobKey: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
}

export interface SupplierSubmission {
  id: string;
  protocol: string;
  supplier_id: string;
  supplier_name: string;
  responsible_name: string | null;
  competence_start: string | Date | null;
  competence_end: string | Date | null;
  status: SubmissionStatus;
  submitted_at: string | Date;
  file_count: number;
  total_bytes: number;
}

export interface SubmissionFile {
  id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string | Date;
}

export interface SubmissionDetails extends SupplierSubmission {
  notes: string | null;
  files: SubmissionFile[];
}

export function createProtocol(date = new Date()): string {
  const day = date.toISOString().slice(0, 10).replaceAll('-', '');
  return `ECO-${day}-${randomBytes(4).toString('hex').toUpperCase()}`;
}

export function createSubmissionIds(supplierId: string, fileCount: number) {
  const submissionId = randomUUID();
  const fileIds = Array.from({ length: fileCount }, () => randomUUID());
  return {
    submissionId,
    fileIds,
    blobKeys: fileIds.map((fileId) => `${supplierId}/${submissionId}/${fileId}.pdf`),
  };
}

async function queryWithClient<T extends QueryResultRow>(
  client: PoolClient,
  text: string,
  params: unknown[]
): Promise<T[]> {
  const result = await client.query<T>(text, params as never[]);
  return result.rows;
}

export async function createSupplierSubmission(input: {
  id: string;
  supplierId: string;
  submittedByEmail: string;
  responsibleName: string;
  competenceStart: string;
  competenceEnd: string;
  notes: string | null;
  sourceIp: string | null;
  sourceUserAgent: string | null;
  files: SubmissionFileInput[];
}): Promise<{ id: string; protocol: string }> {
  return withTransaction(async (client) => {
    const users = await queryWithClient<{ id: string }>(
      client,
      `SELECT id
       FROM app_users
       WHERE email = $1 AND supplier_id = $2 AND role = 'supplier' AND active = TRUE`,
      [input.submittedByEmail, input.supplierId]
    );
    const user = users[0];
    if (!user) throw new Error('Supplier user not found.');

    const protocol = createProtocol();
    await client.query(
      `INSERT INTO document_submissions (
         id, protocol, supplier_id, submitted_by, document_type,
         competence_start, competence_end, business_unit, responsible_name,
         notes, status, source_ip, source_user_agent
       ) VALUES ($1, $2, $3, $4, 'medicao', $5, $6, 'Medição mensal', $7, $8, 'submitted', $9, $10)`,
      [
        input.id,
        protocol,
        input.supplierId,
        user.id,
        input.competenceStart,
        input.competenceEnd,
        input.responsibleName,
        input.notes,
        input.sourceIp,
        input.sourceUserAgent,
      ]
    );

    for (const file of input.files) {
      await client.query(
        `INSERT INTO submission_files (
           id, submission_id, original_name, blob_key, mime_type, size_bytes, sha256, scan_status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
        [
          file.id,
          input.id,
          file.originalName,
          file.blobKey,
          file.mimeType,
          file.sizeBytes,
          file.sha256,
        ]
      );
    }

    await client.query(
      `INSERT INTO submission_events (
         submission_id, actor_user_id, previous_status, new_status, source_ip
       ) VALUES ($1, $2, NULL, 'submitted', $3)`,
      [input.id, user.id, input.sourceIp]
    );
    await client.query(
      `INSERT INTO audit_log (
         actor_user_id, actor_role, action, entity_type, entity_id, metadata,
         source_ip, source_user_agent
       ) VALUES ($1, 'supplier', 'submission.created', 'document_submission', $2, $3::jsonb, $4, $5)`,
      [
        user.id,
        input.id,
        JSON.stringify({ protocol, supplierId: input.supplierId, fileCount: input.files.length }),
        input.sourceIp,
        input.sourceUserAgent,
      ]
    );

    return { id: input.id, protocol };
  });
}

const SUBMISSION_SELECT = `
  SELECT ds.id, ds.protocol, ds.supplier_id, s.legal_name AS supplier_name,
         ds.responsible_name, ds.competence_start, ds.competence_end,
         ds.status, ds.submitted_at, ds.notes,
         COUNT(sf.id)::int AS file_count,
         COALESCE(SUM(sf.size_bytes), 0)::bigint AS total_bytes
  FROM document_submissions ds
  JOIN suppliers s ON s.id = ds.supplier_id
  LEFT JOIN submission_files sf ON sf.submission_id = ds.id
`;

export async function listSupplierSubmissions(supplierId: string): Promise<SupplierSubmission[]> {
  return sql<SupplierSubmission>(
    `${SUBMISSION_SELECT}
     WHERE ds.supplier_id = $1 AND ds.document_type = 'medicao'
     GROUP BY ds.id, s.legal_name
     ORDER BY ds.submitted_at DESC`,
    [supplierId]
  );
}

export async function listInternalSubmissions(): Promise<SupplierSubmission[]> {
  return sql<SupplierSubmission>(
    `${SUBMISSION_SELECT}
     WHERE ds.document_type = 'medicao'
     GROUP BY ds.id, s.legal_name
     ORDER BY ds.submitted_at DESC`
  );
}

export async function getSupplierSubmission(
  submissionId: string,
  supplierId: string
): Promise<SubmissionDetails | null> {
  const submission = await sqlOne<SupplierSubmission & { notes: string | null }>(
    `${SUBMISSION_SELECT}
     WHERE ds.id = $1 AND ds.supplier_id = $2 AND ds.document_type = 'medicao'
     GROUP BY ds.id, s.legal_name`,
    [submissionId, supplierId]
  );
  if (!submission) return null;

  const files = await sql<SubmissionFile>(
    `SELECT id, original_name, mime_type, size_bytes, created_at
     FROM submission_files
     WHERE submission_id = $1
     ORDER BY created_at, original_name`,
    [submissionId]
  );
  return { ...submission, files };
}

export async function getInternalSubmission(submissionId: string): Promise<SubmissionDetails | null> {
  const submission = await sqlOne<SupplierSubmission & { notes: string | null }>(
    `${SUBMISSION_SELECT}
     WHERE ds.id = $1 AND ds.document_type = 'medicao'
     GROUP BY ds.id, s.legal_name`,
    [submissionId]
  );
  if (!submission) return null;

  const files = await sql<SubmissionFile>(
    `SELECT id, original_name, mime_type, size_bytes, created_at
     FROM submission_files
     WHERE submission_id = $1
     ORDER BY created_at, original_name`,
    [submissionId]
  );
  return { ...submission, files };
}

export async function getDownloadableFile(fileId: string): Promise<{
  id: string;
  supplier_id: string;
  original_name: string;
  blob_key: string;
  mime_type: string;
} | null> {
  return sqlOne(
    `SELECT sf.id, ds.supplier_id, sf.original_name, sf.blob_key, sf.mime_type
     FROM submission_files sf
     JOIN document_submissions ds ON ds.id = sf.submission_id
     WHERE sf.id = $1`,
    [fileId]
  );
}
