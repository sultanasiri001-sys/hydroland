import { Injectable } from '@nestjs/common';
import { FinancialTransaction, InvoiceRecord } from './finance.domain';

export interface FinanceGovernanceSnapshot {
  postedRevenue: number;
  postedExpenses: number;
  outstandingReceivables: number;
  refundedPayments: number;
  pendingTransactions: number;
  alerts: string[];
  generatedAt: string;
}

@Injectable()
export class FinanceGovernanceService {
  snapshot(transactions: FinancialTransaction[], invoices: InvoiceRecord[], at = new Date().toISOString()): FinanceGovernanceSnapshot {
    const postedRevenue = transactions.filter((t) => t.status === 'POSTED' && t.type === 'PAYMENT').reduce((sum, t) => sum + t.amount, 0);
    const postedExpenses = transactions.filter((t) => t.status === 'POSTED' && t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);
    const refundedPayments = transactions.filter((t) => t.status === 'REFUNDED' && t.type === 'PAYMENT').reduce((sum, t) => sum + t.amount, 0);
    const outstandingReceivables = invoices.reduce((sum, invoice) => sum + Math.max(0, invoice.totalAmount - invoice.paidAmount), 0);
    const pendingTransactions = transactions.filter((t) => t.status === 'PENDING').length;
    const alerts: string[] = [];
    if (pendingTransactions > 0) alerts.push('PENDING_FINANCIAL_TRANSACTIONS');
    if (outstandingReceivables > 0) alerts.push('OUTSTANDING_RECEIVABLES');
    if (postedExpenses > postedRevenue) alerts.push('EXPENSES_EXCEED_POSTED_REVENUE');
    return { postedRevenue, postedExpenses, outstandingReceivables, refundedPayments, pendingTransactions, alerts, generatedAt: at };
  }

  automationSignals(snapshot: FinanceGovernanceSnapshot): string[] {
    const signals: string[] = [];
    if (snapshot.pendingTransactions) signals.push('REVIEW_PENDING_TRANSACTIONS');
    if (snapshot.outstandingReceivables) signals.push('REVIEW_RECEIVABLE_COLLECTION');
    if (snapshot.alerts.includes('EXPENSES_EXCEED_POSTED_REVENUE')) signals.push('REQUIRE_FINANCIAL_MANAGEMENT_REVIEW');
    return signals;
  }
}
