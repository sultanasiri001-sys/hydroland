import { BadRequestException, Injectable } from '@nestjs/common';
import { FinancialTransaction, InvoiceRecord } from './finance.domain';

export type FinanceApprovalStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED';

export interface FinanceApprovalRequest {
  id: string;
  transactionId: string;
  status: FinanceApprovalStatus;
  requestedBy: string;
  approvedBy?: string;
}

@Injectable()
export class FinanceWorkflowService {
  approve(request: FinanceApprovalRequest, approverId: string): FinanceApprovalRequest {
    if (request.status !== 'REQUESTED') throw new BadRequestException('Only requested finance approvals can be approved.');
    if (!approverId) throw new BadRequestException('Finance approver is required.');
    return { ...request, status: 'APPROVED', approvedBy: approverId };
  }

  postTransaction(transaction: FinancialTransaction, approval?: FinanceApprovalRequest): FinancialTransaction {
    if (transaction.status !== 'PENDING') throw new BadRequestException('Only pending transactions can be posted.');
    if (approval && (approval.transactionId !== transaction.id || approval.status !== 'APPROVED')) throw new BadRequestException('Valid finance approval is required.');
    return { ...transaction, status: 'POSTED' };
  }

  applyPayment(invoice: InvoiceRecord, amount: number): InvoiceRecord {
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('Payment amount must be positive.');
    if (invoice.paidAmount + amount > invoice.totalAmount) throw new BadRequestException('Payment exceeds invoice balance.');
    return { ...invoice, paidAmount: invoice.paidAmount + amount };
  }

  refund(transaction: FinancialTransaction): FinancialTransaction {
    if (transaction.status !== 'POSTED' || transaction.type !== 'PAYMENT') throw new BadRequestException('Only posted payments can be refunded.');
    return { ...transaction, status: 'REFUNDED' };
  }
}
