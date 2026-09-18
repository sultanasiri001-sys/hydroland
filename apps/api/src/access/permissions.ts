export const Permissions = {
  OrganizationRead: 'organization.read',
  OrganizationManage: 'organization.manage',
  AccountRead: 'account.read',
  AccountManage: 'account.manage',
  RoleRead: 'role.read',
  RoleManage: 'role.manage',
  ApprovalRead: 'approval.read',
  ApprovalDecide: 'approval.decide',
  DocumentRead: 'document.read',
  DocumentUpload: 'document.upload',
 'document.download',
  AuditRead: 'audit.read',
} as const;

export type PermissionKey = (typeof Permissions)[keyof typeof Permissions];
