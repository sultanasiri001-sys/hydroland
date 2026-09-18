import { BadRequestException, Injectable } from '@nestjs/common';
import { CustomerCase } from './customer-service.domain';
import { CustomerServiceFoundationService } from './customer-service-foundation.service';

export type CustomerServiceReferenceType = 'BOOKING' | 'PAYMENT' | 'TRIP' | 'TRAINING' | 'SAFETY' | 'RENTAL';

export interface CustomerServiceOperationalReference {
  organizationId: string;
  type: CustomerServiceReferenceType;
  id: string;
  exists: boolean;
  accessible: boolean;
}

@Injectable()
export class CustomerServiceOperationsService {
  constructor(private readonly foundation: CustomerServiceFoundationService) {}

  validateOperationalCase(record: CustomerCase, reference: CustomerServiceOperationalReference): CustomerCase {
    this.foundation.validateCase(record);
    if (record.organizationId !== reference.organizationId) throw new BadRequestException('Customer case organization scope mismatch.');
    if (!reference.exists) throw new BadRequestException('Referenced operational record does not exist.');
    if (!reference.accessible) throw new BadRequestException('Referenced operational record is not accessible.');
    if (record.referenceType !== reference.type || record.referenceId !== reference.id) throw new BadRequestException('Customer case operational reference mismatch.');
    return record;
  }

  escalationRoute(record: CustomerCase): string {
    if (record.type === 'SAFETY_CONCERN') return 'SAFETY';
    if (record.type === 'PAYMENT_ISSUE') return 'FINANCE';
    if (record.type === 'BOOKING_ISSUE') return 'OPERATIONS';
    if (record.priority === 'URGENT') return 'CUSTOMER_SERVICE_MANAGER';
    return 'CUSTOMER_SERVICE';
  }
}
