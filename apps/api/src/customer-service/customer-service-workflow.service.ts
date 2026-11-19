import { BadRequestException, Injectable } from '@nestjs/common';
import { CustomerCase, CustomerCaseStatus, CustomerInteraction } from './customer-service.domain';
import { CustomerServiceFoundationService } from './customer-service-foundation.service';

export function assertCaseAcceptsInteraction(status: CustomerCaseStatus) {
  if (status === 'CLOSED') throw new BadRequestException('Closed cases cannot receive interactions.');
}

@Injectable()
export class CustomerServiceWorkflowService {
  constructor(private readonly foundation: CustomerServiceFoundationService) {}

  assign(record: CustomerCase, accountId: string): CustomerCase {
    this.foundation.validateCase(record);
    if (!accountId) throw new BadRequestException('Assignee is required.');
    if (record.status === 'RESOLVED' || record.status === 'CLOSED') throw new BadRequestException('Resolved or closed cases cannot be assigned.');
    return { ...record, assignedAccountId: accountId, status: 'ASSIGNED' };
  }

  addInteraction(record: CustomerCase, interaction: CustomerInteraction): CustomerInteraction {
    assertCaseAcceptsInteraction(record.status);
    return this.foundation.validateInteraction(interaction, record);
  }

  waitForCustomer(record: CustomerCase): CustomerCase {
    if (record.status !== 'ASSIGNED') throw new BadRequestException('Only assigned cases can wait for customer.');
    return { ...record, status: 'WAITING_CUSTOMER' };
  }

  resolve(record: CustomerCase, resolverId: string): CustomerCase {
    if (!resolverId || record.assignedAccountId !== resolverId) throw new BadRequestException('Assigned resolver is required.');
    if (record.status !== 'ASSIGNED' && record.status !== 'WAITING_CUSTOMER') throw new BadRequestException('Case cannot be resolved from its current state.');
    return { ...record, status: 'RESOLVED' };
  }

  close(record: CustomerCase): CustomerCase {
    if (record.status !== 'RESOLVED') throw new BadRequestException('Only resolved cases can be closed.');
    return { ...record, status: 'CLOSED' };
  }

  objectToResolution(record: CustomerCase, customerId: string): CustomerCase {
    if (record.customerId !== customerId) throw new BadRequestException('The requesting customer must respond to the resolution.');
    if (record.status !== 'RESOLVED' || !record.assignedAccountId) throw new BadRequestException('Only an assigned resolved case can be reopened by the customer.');
    return { ...record, status: 'ASSIGNED' };
  }
}
