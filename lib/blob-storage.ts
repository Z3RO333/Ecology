import 'server-only';

import { BlobServiceClient, type BlockBlobClient } from '@azure/storage-blob';

const CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER ?? 'medicoes';

let blobServiceClient: BlobServiceClient | null = null;

function getBlobServiceClient(): BlobServiceClient {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error('AZURE_STORAGE_CONNECTION_STRING is not configured.');
  }

  if (!blobServiceClient) {
    blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  }
  return blobServiceClient;
}

async function getBlockBlobClient(blobKey: string): Promise<BlockBlobClient> {
  const container = getBlobServiceClient().getContainerClient(CONTAINER_NAME);
  await container.createIfNotExists();
  return container.getBlockBlobClient(blobKey);
}

export async function uploadPrivateBlob(
  blobKey: string,
  content: Buffer,
  contentType: string
): Promise<void> {
  const blob = await getBlockBlobClient(blobKey);
  await blob.uploadData(content, {
    blobHTTPHeaders: { blobContentType: contentType },
  });
}

export async function downloadPrivateBlob(blobKey: string): Promise<Buffer> {
  const blob = await getBlockBlobClient(blobKey);
  return blob.downloadToBuffer();
}

export async function deletePrivateBlob(blobKey: string): Promise<void> {
  const blob = await getBlockBlobClient(blobKey);
  await blob.deleteIfExists();
}
