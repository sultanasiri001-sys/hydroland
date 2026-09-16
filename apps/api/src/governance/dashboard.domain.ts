export interface TrainingOperationsSnapshot {
  activeCourses: number;
  delayedCourses: number;
  suspendedCourses: number;
  pendingComplaints: number;
  slaBreaches: number;
  instructorTransfers: number;
  pendingApprovals: number;
  resourceConflicts: number;
  interCenterRequests: number;
}

export interface ExecutiveGovernanceSnapshot extends TrainingOperationsSnapshot {
  elevatedOverrides: number;
  expiredDelegations: number;
  recentPolicyChanges: number;
  deniedSensitiveActions: number;
  expiringCredentials: number;
  outstandingPayables: number;
}
