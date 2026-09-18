export enum AdministrativeRecordType {
  INCOMING_CORRESPONDENCE = 'INCOMING_CORRESPONDENCE',
  OUTGOING_CORRESPONDENCE = 'OUTGOING_CORRESPONDENCE',
  INTERNAL_MEMO = 'INTERNAL_MEMO',
  MEETING_RECORD = 'MEETING_RECORD',
  GENERAL_DOCUMENT = 'GENERAL_DOCUMENT',
}

export enum AdministrativeRecordStatus {
  DRAFT = 'DRAFT',
  REGISTERED = 'REGISTERED',
  ARCHIVED = 'ARCHIVED',
}

export interface AdministrativeUnit {
  id: string;
  organizationId: string;
  name: string;
  managerAccountId: string;
  active: boolean;
}

export interface AdministrativeRecord {
  id: string;
  organizationId: string;
  unitId: string;
  type: AdministrativeRecordType;
  referenceNumber: string;
  subject: string;
  status: AdministrativeRecordStatus;
  ownerAccountId: string;
  createdAt: Date;
}

export interface AdministrativeMeeting {
  id: string;
  organizationId: string;
  unitId: string;
  title: string;
  scheduledAt: Date;
  organizerAccountId: string;
  participantAccountIds: string[];
}
