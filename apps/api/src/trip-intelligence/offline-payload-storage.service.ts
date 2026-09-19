import {Injectable,ServiceUnavailableException} from '@nestjs/common';
import {IntegrationService} from '../integrations/integration.service';

export type OfflinePayloadDescriptor={
 storageKey:string;
 checksum:string;
 sizeBytes?:number|null;
 contentType?:string|null;
};

@Injectable()
export class OfflinePayloadStorageService {
 constructor(private readonly integrations:IntegrationService){}
 readonly provider='NOT_SELECTED' as const;

 async delivery(descriptor:OfflinePayloadDescriptor){
  if(!descriptor.storageKey?.trim())throw new ServiceUnavailableException('Offline payload storage reference is unavailable.');
  this.integrations.requireOperational('OBJECT_STORAGE');
  throw new ServiceUnavailableException('Offline payload storage adapter is not implemented.');
 }
}
