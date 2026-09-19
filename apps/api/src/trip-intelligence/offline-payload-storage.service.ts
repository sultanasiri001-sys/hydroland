import {Injectable,ServiceUnavailableException} from '@nestjs/common';

export type OfflinePayloadDescriptor={
 storageKey:string;
 checksum:string;
 sizeBytes?:number|null;
 contentType?:string|null;
};

@Injectable()
export class OfflinePayloadStorageService {
 readonly provider='NOT_SELECTED' as const;

 async delivery(descriptor:OfflinePayloadDescriptor){
  if(!descriptor.storageKey?.trim())throw new ServiceUnavailableException('Offline payload storage reference is unavailable.');
  throw new ServiceUnavailableException('Offline payload storage provider is not configured.');
 }
}
