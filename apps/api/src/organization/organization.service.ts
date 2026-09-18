import { BadRequestException, Injectable } from '@nestjs/common';
import { OrganizationNode } from './organization.types';

@Injectable()
export class OrganizationService {
  validateParent(node: OrganizationNode, parent?: OrganizationNode): void {
    const allowed: Record<OrganizationNode['type'], OrganizationNode['type'][]> = {
      HQ: [], REGION:['HQ'], CENTER:['REGION','HQ'], DEPARTMENT:['CENTER','HQ'], UNIT:['DEPARTMENT'], TEAM:['UNIT','DEPARTMENT'],
    };
    if(node.type==='HQ' && node.parentId!==null) throw new BadRequestException('HQ cannot have a parent');
    if(node.type!=='HQ' && (!parent || !allowed[node.type].includes(parent.type))) throw new BadRequestException('Invalid organization hierarchy');
  }
}
