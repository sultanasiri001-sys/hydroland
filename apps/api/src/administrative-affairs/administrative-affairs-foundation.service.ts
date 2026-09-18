import { BadRequestException, Injectable } from '@nestjs/common';
import { AdministrativeMeeting, AdministrativeRecord, AdministrativeUnit } from './administrative-affairs.domain';

@Injectable()
export class AdministrativeAffairsFoundationService {
  validateUnit(unit: AdministrativeUnit): void {
    if (!unit.id || !unit.organizationId || !unit.name?.trim() || !unit.managerAccountId) throw new BadRequestException('Administrative unit identity, organization, name and manager are required.');
  }

  validateRecord(record: AdministrativeRecord, unit: AdministrativeUnit): void {
    this.validateUnit(unit);
    if (!record.id || !record.referenceNumber?.trim() || !record.subject?.trim() || !record.ownerAccountId) throw new BadRequestException('Administrative record identity, reference, subject and owner are required.');
    if (record.organizationId !== unit.organizationId || record.unitId !== unit.id) throw new BadRequestException('Administrative record scope mismatch.');
  }

  validateMeeting(meeting: AdministrativeMeeting, unit: AdministrativeUnit): void {
    this.validateUnit(unit);
    if (!meeting.id || !meeting.title?.trim() || !meeting.organizerAccountId || !(meeting.scheduledAt instanceof Date) || Number.isNaN(meeting.scheduledAt.getTime())) throw new BadRequestException('Administrative meeting identity, title, organizer and valid schedule are required.');
    if (meeting.organizationId !== unit.organizationId || meeting.unitId !== unit.id) throw new BadRequestException('Administrative meeting scope mismatch.');
    if (!meeting.participantAccountIds.length) throw new BadRequestException('Administrative meeting requires at least one participant.');
  }
}
