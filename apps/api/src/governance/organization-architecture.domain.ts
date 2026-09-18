export type OrganizationNodeKind = 'HEADQUARTERS' | 'REGION' | 'CENTER' | 'DEPARTMENT' | 'UNIT' | 'TEAM';
export type ActivationState = 'INACTIVE' | 'PILOT' | 'ACTIVE' | 'SUSPENDED';
export type LeadershipMode = 'EXECUTIVE_SECRETARY' | 'AI_MANAGER' | 'HUMAN_MANAGER' | 'HYBRID';

export interface OrganizationNode {
  id: string;
  kind: OrganizationNodeKind;
  name: string;
  parentId?: string;
  regionCode?: string;
  centerId?: string;
  departmentId?: string;
  activation: ActivationState;
}

export interface DepartmentOperatingProfile {
  departmentId: string;
  centerId?: string;
  activation: ActivationState;
  leadershipMode: LeadershipMode;
  leaderPersonId?: string;
  leaderAgentId?: string;
  executiveSecretaryFallback: boolean;
}

export interface CenterDepartmentControl {
  centerId: string;
  departmentId: string;
  enabled: boolean;
  managerEnabled: boolean;
  enabledCapabilities: string[];
  disabledCapabilities: string[];
  effectiveFrom?: string;
  effectiveUntil?: string;
}

export interface OperatingStage {
  level: 1 | 2 | 3 | 4;
  name: 'EXECUTIVE_SECRETARY' | 'DEPARTMENT_MANAGERS' | 'CENTER_MANAGERS' | 'SPECIALIZED_WORKFORCE';
}

export const HYDROLAND_OPERATING_STAGES: readonly OperatingStage[] = [
  { level: 1, name: 'EXECUTIVE_SECRETARY' },
  { level: 2, name: 'DEPARTMENT_MANAGERS' },
  { level: 3, name: 'CENTER_MANAGERS' },
  { level: 4, name: 'SPECIALIZED_WORKFORCE' },
];
