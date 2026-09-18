export type OrganizationNodeType = 'HQ' | 'REGION' | 'CENTER' | 'DEPARTMENT' | 'UNIT' | 'TEAM';

export interface OrganizationNode {
  id: string;
  type: OrganizationNodeType;
  name: string;
  parentId: string | null;
  active: boolean;
}
