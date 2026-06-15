import { notFound } from 'next/navigation';
import { isAuthorized } from '@/lib/authorization';
import { getInternalSubmission } from '@/lib/supplier-documents';
import { SubmissionDetails } from '@/components/fornecedor/SubmissionDetails';

export default async function InternalSubmissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAuthorized('supplier-documents:review'))) notFound();

  const { id } = await params;
  const submission = await getInternalSubmission(id);
  if (!submission) notFound();

  return <SubmissionDetails submission={submission} backHref="/dashboard/medicoes" />;
}
