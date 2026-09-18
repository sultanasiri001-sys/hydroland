import { BadRequestException, Injectable } from '@nestjs/common';
import { FinancialAccount, FinancialTransaction, InvoiceRecord } from './finance.domain';
import { FinanceFoundationService } from './finance-foundation.service';
import { FinanceWorkflowService } from './finance-workflow.service';

export type FinancialSourceType = 'BOOKING' | 'TRIP' | 'TRAINING' | 'STORE' | 'RENTAL' | 'CENTER_SERVICE';

export interface FinancialOperation {
  sourceType: FinancialSourceType;
  sourceId: string;
  organizationId: string;
  amount: number;
  currency: string;
}

@Injectable()
export class FinanceOperationsService {
  constructor(
    private readonly foundation: FinanceFoundationService,
    private readonly workflow: FinanceWorkflowService,
  ) {}

  validateOperation(operation: FinancialOperation, account: FinancialAccount): FinancialOperation {
    this.foundation.validateAccount(account);
    if (!operation.sourceId || operation.organizationId !== account.organizationId) throw new BadRequestException('Financial operation scope mismatch.');
    if (!Number.isFinite(operation.amount) || operation.amount <= 0) throw new BadRequestException('Financial operation amount must be positive.');
    if (operation.currency !== account.currency) throw new BadRequestException('Financial operation currency mismatch.');
    return operation;
  }

  applyOperationalPayment(operation: FinancialOperation, invoice: InvoiceRecord): InvoiceRecord {
    if (invoice.organizationId !== operation.organizationId || invoice.referenceType !== operation.sourceType || invoice.referenceId !== operation.sourceId) {
      throw new BadRequestException('Invoice is not linked to the financial operation.');
    }
    return this.workflow.applyPayment(invoice, operation.amount);
  }

  postOperationalTransaction(operation: FinancialOperation, transaction: FinancialTransaction, account: FinancialAccount): FinancialTransaction {
    this.validateOperation(operation, account);
    this.foundation.validateTransaction(transaction, account);
    if (transaction.referenceType !== operation.sourceType || transaction.referenceId !== operation.sourceId || transaction.amount !== operation.amount) {
      throw new BadRequestException('Transaction is not linked to the financial operation.');
    }
    return this.workflow.postTransaction(transaction);
  }
}
