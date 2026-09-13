import { Injectable, NotImplementedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

@Injectable()
export class DocumentStorageService {
  createObjectKey(personId: string, originalFileName: string) {
    const extension = originalFileName.includes('.') ? originalFileName.split('.').pop()?.toLowerCase() : undefined;
    const safeExtension = extension?.replace(/[^a-z0-9]/g, '').slice(0, 8);
    return `private/documents/${personId}/${randomUUID()}${safeExtension ? `.${safeExtension}` : ''}`;
  }

  createUploadIntent(personId: string, originalFileName: string) {
    const objectKey = this.createObjectKey(personId, originalFileName);
    return {
      objectKey,
      storageVisibility: 'PRIVATE' as const,
      uploadUrl: null,
      uploadUrlStatus: 'STORAGE_PROVIDER_NOT_CONNECTED' as const,
      expiresInSeconds: null,
    };
  }

  createTemporaryReadUrl(_objectKey: string): never {
    throw new NotImplementedException('مزود التخزين الخاص غير متصل بعد');
  }
}
