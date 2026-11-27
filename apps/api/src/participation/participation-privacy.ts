import { ForbiddenException } from '@nestjs/common';

// Private participation sources share native document storage, never generic access.
// Keep this boundary independent of participation services and their dependencies.
export const PARTICIPATION_SOURCE_PREFIX = 'D01-';
export const isParticipationSourceCode = (value: unknown) =>
  typeof value === 'string' && value.startsWith(PARTICIPATION_SOURCE_PREFIX);
export const genericDocumentTemplateWhere = {
  NOT: { code: { startsWith: PARTICIPATION_SOURCE_PREFIX } },
} as const;

export function assertNotParticipationSource(code: unknown) {
  if (isParticipationSourceCode(code)) {
    throw new ForbiddenException('Use the private participation workspace for this source.');
  }
}
