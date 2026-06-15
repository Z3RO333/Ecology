import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getSupplierSubmission } from '@/lib/supplier-documents';
import { SubmissionDetails } from '@/components/fornecedor/SubmissionDetails';

export default async function SupplierSubmissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;
  const submission = await getSupplierSubmission(id, session!.user.supplierId!);
  if (!submission) notFound();

  return <SubmissionDetails submission={submission} backHref="/fornecedor/envios" />;
}
