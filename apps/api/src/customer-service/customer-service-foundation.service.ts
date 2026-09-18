import { BadRequestException, Injectable } from '@nestjs/common';
import { CustomerCase, CustomerInteraction } from './customer-service.domain';

@Injectable()
export class CustomerServiceFoundationService {
  validateCase(record: CustomerCase): CustomerCase {
    if (!record.id || !record.organizationId || !record.customerId) throw new BadRequestException('Customer case identity and scope are required.');
    if (!record.subject?.trim() || !record.description?.trim()) throw new BadRequestException('Customer case subject and description are required.');
    if ((record.referenceType && !record.referenceId) || (!record.referenceType && record.referenceId)) throw new BadRequestException('Customer case reference must include both type and id.');
    return record;
  }

  validateInteraction(interaction: CustomerInteraction, record: CustomerCase): CustomerInteraction {
    if (!interaction.id || interaction.caseId !== record.id) throw new BadRequestException('Customer interaction case scope mismatch.');
    if (!interaction.message?.trim()) throw new BadRequestException('Customer interaction message is required.');
    if (interaction.actorType !== 'SYSTEM' && !interaction.actorId) throw new BadRequestException('Interaction actor identity is required.');
    return interaction;
  }
}
