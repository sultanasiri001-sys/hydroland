import { BadRequestException, Injectable } from '@nestjs/common';
import { FinancialAccount, FinancialTransaction, InvoiceRecord } from './finance.domain';

@Injectable()
export class FinanceFoundationService {
  validateAccount(account: FinancialAccount): FinancialAccount {
    if (!account.id || !account.organizationId || !account.name || !account.currency) throw new BadRequestException('Financial account identity is incomplete.');
    return account;
  }

  validateTransaction(transaction: FinancialTransaction, account: FinancialAccount): FinancialTransaction {
    if (transaction.accountId !== account.id || transaction.organizationId !== account.organizationId) throw new BadRequestException('Financial transaction scope mismatch.');
    if (!Number.isFinite(transaction.amount) || transaction.amount <= 0) throw new BadRequestException('Financial transaction amount must be positive.');
    if (transaction.currency !== account.currency) throw new BadRequestException('Financial transaction currency mismatch.');
    if (!transaction.referenceType || !transaction.referenceId) throw new BadRequestException('Financial transaction reference is required.');
    return transaction;
  }

  validateInvoice(invoice: InvoiceRecord): InvoiceRecord {
    if (!invoice.id || !invoice.organizationId || !invoice.customerId || !invoice.currency) throw new BadRequestException('Invoice identity is incomplete.');
    if (!Number.isFinite(invoice.totalAmount) || invoice.totalAmount < 0 || !Number.isFinite(invoice.paidAmount) || invoice.paidAmount < 0 || invoice.paidAmount > invoice.totalAmount) throw new BadRequestException('Invoice amounts are invalid.');
    if (!invoice.referenceType || !invoice.referenceId) throw new BadRequestException('Invoice reference is required.');
    return invoice;
  }
}
