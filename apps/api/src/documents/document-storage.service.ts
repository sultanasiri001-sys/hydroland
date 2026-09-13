import { Injectable, NotImplementedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

export type VerifiedStoredDocument = {
  objectKey: string;
  mimeType: string;
  byteSize: number;
  sha256Hex: string;
  malwareScanStatus: 'CLEAN' | 'REJECTED';
  malwareScanDetail?: string;
  scannedAt: Date;
};

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

  async verifyUploadedObject(_objectKey: string): Promise<VerifiedStoredDocument> {
    throw new NotImplementedException(
      'مزود التخزين والفحص الأمني غير متصل؛ لا يمكن اعتماد بيانات الملف المرسلة من العميل',
    );
  }

  createTemporaryReadUrl(_objectKey: string): never {
    throw new NotImplementedException('مزود التخزين الخاص غير متصل بعد');
  }
}
