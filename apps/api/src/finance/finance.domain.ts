export type FinancialTransactionStatus = 'PENDING' | 'POSTED' | 'VOIDED' | 'REFUNDED';
export type FinancialTransactionType = 'PAYMENT' | 'REFUND' | 'EXPENSE' | 'SETTLEMENT' | 'ADJUSTMENT';

export interface FinancialAccount {
  id: string;
  organizationId: string;
  name: string;
  currency: string;
  active: boolean;
}

export interface FinancialTransaction {
  id: string;
  organizationId: string;
  accountId: string;
  type: FinancialTransactionType;
  status: FinancialTransactionStatus;
  amount: number;
  currency: string;
  referenceType: string;
  referenceId: string;
  createdAt: string;
}

export interface InvoiceRecord {
  id: string;
  organizationId: string;
  customerId: string;
  currency: string;
  totalAmount: number;
  paidAmount: number;
  referenceType: string;
  referenceId: string;
}
