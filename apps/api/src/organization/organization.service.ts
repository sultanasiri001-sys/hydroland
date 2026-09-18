import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../database/database.service';
import { OrganizationNode } from './organization.types';
@Injectable()
export class OrganizationService {
 constructor(private readonly db:DatabaseService){}
 validateParent(node:OrganizationNode,parent?:OrganizationNode):void {
  const allowed:Record<OrganizationNode['type'],OrganizationNode['type'][]>={
   HQ:[],REGION:['HQ'],CENTER:['REGION','HQ'],DEPARTMENT:['CENTER','HQ'],UNIT:['DEPARTMENT'],TEAM:['UNIT','DEPARTMENT'],
  };
  if(node.type==='HQ'&&node.parentId!==null) throw new BadRequestException('HQ cannot have a parent');
  if(node.type!=='HQ'&&(!parent||!allowed[node.type].includes(parent.type))) throw new BadRequestException('Invalid organization hierarchy');
 }
 async get(id:string):Promise<OrganizationNode>{
  const r=await this.db.query<any>('SELECT id,node_type,name,parent_id,active FROM organization_nodes WHERE id=$1',[id]);
  if(!r.rows[0]) throw new NotFoundException('Organization node not found'); const x=r.rows[0];
  return {id:x.id,type:x.node_type,name:x.name,parentId:x.parent_id,active:x.active};
 }
 async create(input:{type:OrganizationNode['type'];name:string;parentId:string|null}):Promise<OrganizationNode>{
  const id=randomUUID(); const node:OrganizationNode={id,type:input.type,name:input.name,parentId:input.parentId,active:true};
  const parent=input.parentId?await this.get(input.parentId):undefined; this.validateParent(node,parent);
  await this.db.query('INSERT INTO organization_nodes(id,node_type,name,parent_id,active) VALUES($1,$2,$3,$4,TRUE)',[id,node.type,node.name,node.parentId]);
  return node;
 }
}
