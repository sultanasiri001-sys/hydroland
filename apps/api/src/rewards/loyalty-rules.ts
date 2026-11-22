import { BadRequestException } from '@nestjs/common';

export const maxMinor = 2_147_483_647;
export function minor(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= maxMinor;
}
export function textId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 150 && value.trim() === value;
}
export function earnPoints(paidMinor: number) {
  if (!minor(paidMinor)) throw new BadRequestException('Invalid qualifying amount.');
  return Math.floor(paidMinor / 200);
}
export function offerQuote(offer: {priceMinor:number;pointsCost:number;platformBps:number}, available: number) {
  if (!minor(available) || !minor(offer.priceMinor) || !minor(offer.pointsCost) || !offer.pointsCost
    || offer.priceMinor < offer.pointsCost || !minor(offer.platformBps) || offer.platformBps > 10000) {
    throw new BadRequestException('Invalid offer terms.');
  }
  const heldPoints = Math.min(available, offer.pointsCost);
  const cashDueMinor = offer.pointsCost - heldPoints;
  const bonusMinor = offer.priceMinor - offer.pointsCost;
  const promotional = bonusMinor > 0;
  const campaignDiscount = promotional ? bonusMinor : heldPoints;
  const platformShare = Math.floor((campaignDiscount * offer.platformBps + 5000) / 10000);
  const centerContributionMinor = campaignDiscount - platformShare;
  // The face value surrendered by the member was reserved when their points were issued.
  const platformContributionMinor = offer.priceMinor - cashDueMinor - centerContributionMinor;
  return {heldPoints,cashDueMinor,topUpMinor:promotional ? cashDueMinor : 0,bonusMinor,
    platformContributionMinor,centerContributionMinor,supplierBeforeCommissionMinor:offer.priceMinor-centerContributionMinor,
    additionalPlatformBudgetMinor:promotional ? platformShare : 0};
}
