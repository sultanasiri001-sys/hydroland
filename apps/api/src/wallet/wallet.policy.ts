export type WalletMutationPolicy = {
  creditEnabled: boolean;
  debitEnabled: boolean;
  refundEnabled: boolean;
  adjustmentEnabled: boolean;
};

export const walletMutationPolicy: WalletMutationPolicy = {
  creditEnabled: false,
  debitEnabled: false,
  refundEnabled: false,
  adjustmentEnabled: false,
};
