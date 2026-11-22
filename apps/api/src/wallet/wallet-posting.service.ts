import { ConflictException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { requirePlatformFinanceApprover } from '../finance/finance-operation-grant.service';
import { postingTransaction, requirePostingEnabled, verifiedEntry } from '../finance/posting/ledger-proof';

@Injectable()
export class WalletPostingService {
  constructor(private readonly db: DatabaseService) {}

  // Amount and beneficiary come from the posted ledger, never from a customer request.
  async post(actor: string, entryId: string) {
    requirePostingEnabled();
    return postingTransaction(this.db,async tx => {
      const owner = await requirePlatformFinanceApprover(tx, actor);
      const entry = await verifiedEntry(tx, entryId);
      const key = 'wallet:posted:' + entry.id;
      const existing = await tx.walletEntry.findUnique({where:{idempotencyKey:key}});
      if (existing) return existing;
      const credit = entry.type === 'REVENUE' && entry.referenceType === 'WALLET_FUNDING';
      const debit = entry.type === 'EXPENSE' && entry.referenceType === 'WALLET_PURCHASE';
      const refund = entry.type === 'REFUND' && entry.referenceType === 'WALLET_PURCHASE_REFUND';
      if (!credit && !debit && !refund) throw new ConflictException('Unsupported wallet posting reference.');
      let accountId = entry.referenceId;
      if (refund) {
        const original = await tx.walletEntry.findUnique({where:{id:entry.referenceId},include:{wallet:true}});
        if (!original || original.type !== 'DEBIT' || original.referenceType !== 'FINANCE_ENTRY' || !original.referenceId) {
          throw new ConflictException('A referenced wallet purchase is required.');
        }
        const source = await verifiedEntry(tx,original.referenceId);
        if (source.organizationId !== entry.organizationId) throw new ConflictException('Refund center mismatch.');
        const returned = await tx.walletEntry.aggregate({where:{
          walletId:original.walletId,type:'REFUND',referenceType:'WALLET_DEBIT',referenceId:original.id,
        },_sum:{amountMinor:true}});
        if ((returned._sum.amountMinor ?? 0) + entry.amountMinor > original.amountMinor) {
          throw new ConflictException('Refund exceeds the original wallet purchase.');
        }
        accountId = original.wallet.accountId;
      }
      const account = await tx.account.findFirst({where:{id:accountId,status:'ACTIVE'},select:{id:true}});
      if (!account) throw new ConflictException('Active wallet account required.');
      const wallet = await tx.wallet.upsert({where:{accountId},create:{accountId},update:{}});
      if (wallet.currency !== 'SAR') throw new ConflictException('Wallet currency mismatch.');
      if (debit) {
        const change = await tx.wallet.updateMany({where:{id:wallet.id,balanceMinor:{gte:entry.amountMinor}},
          data:{balanceMinor:{decrement:entry.amountMinor}}});
        if (!change.count) throw new ConflictException('Insufficient wallet balance.');
      } else {
        await tx.wallet.update({where:{id:wallet.id},data:{balanceMinor:{increment:entry.amountMinor}}});
      }
      const balance = await tx.wallet.findUniqueOrThrow({where:{id:wallet.id}});
      const row = await tx.walletEntry.create({data:{walletId:wallet.id,idempotencyKey:key,
        type:debit?'DEBIT':refund?'REFUND':'CREDIT',amountMinor:entry.amountMinor,balanceAfterMinor:balance.balanceMinor,
        referenceType:refund?'WALLET_DEBIT':'FINANCE_ENTRY',referenceId:refund?entry.referenceId:entry.id,
        metadata:{financeEntryId:entry.id,organizationId:entry.organizationId}}});
      await tx.auditEvent.create({data:{actorId:owner.personId,action:'WALLET_RECEIPT_POSTED',resource:'WalletEntry',resourceId:row.id,
        metadata:{financeEntryId:entry.id,accountId}}});
      return row;
    });
  }
}
