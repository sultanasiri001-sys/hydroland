export type CustomerCaseType = 'QUESTION' | 'SUPPORT' | 'COMPLAINT' | 'BOOKING_ISSUE' | 'PAYMENT_ISSUE' | 'SAFETY_CONCERN';
export type CustomerCaseStatus = 'OPEN' | 'ASSIGNED' | 'WAITING_CUSTOMER' | 'RESOLVED' | 'CLOSED';
export type CustomerCasePriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface CustomerCase {
  id: string;
  organizationId: string;
  customerId: string;
  type: CustomerCaseType;
  status: CustomerCaseStatus;
  priority: CustomerCasePriority;
  subject: string;
  description: string;
  referenceType?: string;
  referenceId?: string;
  assignedAccountId?: string;
  createdAt: Date;
}

export interface CustomerInteraction {
  id: string;
  caseId: string;
  actorType: 'CUSTOMER' | 'STAFF' | 'AI_AGENT' | 'SYSTEM';
  actorId?: string;
  channel: 'APP' | 'WEB' | 'EMAIL' | 'PHONE' | 'WHATSAPP' | 'SYSTEM';
  message: string;
  createdAt: Date;
}
