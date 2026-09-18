import { BadRequestException } from '@nestjs/common';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function requireOpaqueId(value:string): string {
  if(!UUID.test(value)) throw new BadRequestException('Invalid resource identifier');
  return value;
}
