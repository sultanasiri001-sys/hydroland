export type RewardsPolicy = {
  earningEnabled: boolean;
  redemptionEnabled: boolean;
  expirationEnabled: boolean;
  earnPointsPerMinor: number | null;
  redemptionValueMinorPerPoint: number | null;
  expirationDays: number | null;
};

export const rewardsPolicy: RewardsPolicy = {
  earningEnabled: false,
  redemptionEnabled: false,
  expirationEnabled: false,
  earnPointsPerMinor: null,
  redemptionValueMinorPerPoint: null,
  expirationDays: null,
};
