-- CANDIDATE: new installation only; never applies to production.
-- Internal UUIDs retained; external references use the installed parent ID type.
CREATE TYPE "TrainingCourseStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED');
CREATE TYPE "WorkforceCenterDepartmentStatus" AS ENUM ('LOCKED', 'ENABLED');
CREATE TYPE "WorkforceDepartmentStatus" AS ENUM ('ENABLED', 'DISABLED');
CREATE TYPE "WorkforceHiringRequestSource" AS ENUM ('CANDIDATE', 'CENTER_MANAGER', 'HUMAN_RESOURCES');
CREATE TYPE "WorkforceHiringRequestStatus" AS ENUM ('PENDING_HR_REVIEW', 'HR_CHANGES_REQUIRED', 'PENDING_EXECUTIVE_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE "WorkforceMode" AS ENUM ('DISABLED', 'AI_ONLY', 'HUMAN_ONLY', 'HYBRID');
CREATE TYPE "WorkforcePositionTier" AS ENUM ('MANAGER', 'ASSISTANT');
CREATE TYPE "WorkforceSeatAccessStatus" AS ENUM ('LOCKED', 'ENABLED', 'SUSPENDED');
CREATE TYPE "WorkforceSeatScope" AS ENUM ('HEADQUARTERS', 'EXTERNAL_CENTER');
DO $completion$
DECLARE parent_type text; parent_types text[] := ARRAY[]::text[];
BEGIN
  SELECT format_type(a.atttypid,a.atttypmod) INTO STRICT parent_type FROM pg_attribute a WHERE a.attrelid='"Trip"'::regclass AND a.attname='id' AND NOT a.attisdropped;
  IF parent_type NOT IN ('text','uuid') THEN RAISE EXCEPTION 'Unsupported parent ID type: %', parent_type; END IF;
  parent_types := array_append(parent_types,parent_type);
  SELECT format_type(a.atttypid,a.atttypmod) INTO STRICT parent_type FROM pg_attribute a WHERE a.attrelid='"SafetyChecklist"'::regclass AND a.attname='id' AND NOT a.attisdropped;
  IF parent_type NOT IN ('text','uuid') THEN RAISE EXCEPTION 'Unsupported parent ID type: %', parent_type; END IF;
  parent_types := array_append(parent_types,parent_type);
  SELECT format_type(a.atttypid,a.atttypmod) INTO STRICT parent_type FROM pg_attribute a WHERE a.attrelid='"Account"'::regclass AND a.attname='id' AND NOT a.attisdropped;
  IF parent_type NOT IN ('text','uuid') THEN RAISE EXCEPTION 'Unsupported parent ID type: %', parent_type; END IF;
  parent_types := array_append(parent_types,parent_type);
  EXECUTE format('CREATE TABLE "ComplianceAssessment" (
  "id" uuid NOT NULL,
  "tripId" %s NOT NULL,
  "safetyChecklistId" %s,
  "decision" text NOT NULL,
  "results" jsonb NOT NULL,
  "assessedByAccountId" %s,
  "assessedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
)', parent_types[1], parent_types[2], parent_types[3]);
END
$completion$;
CREATE TABLE "ComplianceEvidence" (
  "id" uuid NOT NULL,
  "assessmentId" uuid NOT NULL,
  "controlId" text NOT NULL,
  "evidenceType" text NOT NULL,
  "reference" text,
  "validFrom" timestamp(3) without time zone,
  "validUntil" timestamp(3) without time zone,
  "verified" boolean DEFAULT false NOT NULL,
  "metadata" jsonb,
  "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) without time zone NOT NULL
);
DO $completion$
DECLARE parent_type text; parent_types text[] := ARRAY[]::text[];
BEGIN
  SELECT format_type(a.atttypid,a.atttypmod) INTO STRICT parent_type FROM pg_attribute a WHERE a.attrelid='"Account"'::regclass AND a.attname='id' AND NOT a.attisdropped;
  IF parent_type NOT IN ('text','uuid') THEN RAISE EXCEPTION 'Unsupported parent ID type: %', parent_type; END IF;
  parent_types := array_append(parent_types,parent_type);
  EXECUTE format('CREATE TABLE "TrainingCourse" (
  "id" uuid NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "level" text,
  "capacity" integer DEFAULT 20 NOT NULL,
  "status" "TrainingCourseStatus" DEFAULT ''DRAFT''::"TrainingCourseStatus" NOT NULL,
  "instructorAccountId" %s NOT NULL,
  "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) without time zone NOT NULL
)', parent_types[1]);
END
$completion$;
DO $completion$
DECLARE parent_type text; parent_types text[] := ARRAY[]::text[];
BEGIN
  SELECT format_type(a.atttypid,a.atttypmod) INTO STRICT parent_type FROM pg_attribute a WHERE a.attrelid='"Organization"'::regclass AND a.attname='id' AND NOT a.attisdropped;
  IF parent_type NOT IN ('text','uuid') THEN RAISE EXCEPTION 'Unsupported parent ID type: %', parent_type; END IF;
  parent_types := array_append(parent_types,parent_type);
  SELECT format_type(a.atttypid,a.atttypmod) INTO STRICT parent_type FROM pg_attribute a WHERE a.attrelid='"Account"'::regclass AND a.attname='id' AND NOT a.attisdropped;
  IF parent_type NOT IN ('text','uuid') THEN RAISE EXCEPTION 'Unsupported parent ID type: %', parent_type; END IF;
  parent_types := array_append(parent_types,parent_type);
  EXECUTE format('CREATE TABLE "WorkforceCenterDepartment" (
  "id" uuid NOT NULL,
  "organizationId" %s NOT NULL,
  "departmentId" uuid NOT NULL,
  "status" "WorkforceCenterDepartmentStatus" DEFAULT ''LOCKED''::"WorkforceCenterDepartmentStatus" NOT NULL,
  "managerAccessEnabled" boolean DEFAULT false NOT NULL,
  "updatedById" %s,
  "activatedAt" timestamp(3) without time zone,
  "lockedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP,
  "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) without time zone NOT NULL,
  "maxLevel" text DEFAULT ''L1''::text NOT NULL
)', parent_types[1], parent_types[2]);
END
$completion$;
CREATE TABLE "WorkforceDepartment" (
  "id" uuid NOT NULL,
  "code" text NOT NULL,
  "nameAr" text NOT NULL,
  "nameEn" text NOT NULL,
  "description" text,
  "status" "WorkforceDepartmentStatus" DEFAULT 'ENABLED'::"WorkforceDepartmentStatus" NOT NULL,
  "isHumanResources" boolean DEFAULT false NOT NULL,
  "displayOrder" integer DEFAULT 0 NOT NULL,
  "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) without time zone NOT NULL
);
DO $completion$
DECLARE parent_type text; parent_types text[] := ARRAY[]::text[];
BEGIN
  SELECT format_type(a.atttypid,a.atttypmod) INTO STRICT parent_type FROM pg_attribute a WHERE a.attrelid='"Organization"'::regclass AND a.attname='id' AND NOT a.attisdropped;
  IF parent_type NOT IN ('text','uuid') THEN RAISE EXCEPTION 'Unsupported parent ID type: %', parent_type; END IF;
  parent_types := array_append(parent_types,parent_type);
  SELECT format_type(a.atttypid,a.atttypmod) INTO STRICT parent_type FROM pg_attribute a WHERE a.attrelid='"Account"'::regclass AND a.attname='id' AND NOT a.attisdropped;
  IF parent_type NOT IN ('text','uuid') THEN RAISE EXCEPTION 'Unsupported parent ID type: %', parent_type; END IF;
  parent_types := array_append(parent_types,parent_type);
  SELECT format_type(a.atttypid,a.atttypmod) INTO STRICT parent_type FROM pg_attribute a WHERE a.attrelid='"Account"'::regclass AND a.attname='id' AND NOT a.attisdropped;
  IF parent_type NOT IN ('text','uuid') THEN RAISE EXCEPTION 'Unsupported parent ID type: %', parent_type; END IF;
  parent_types := array_append(parent_types,parent_type);
  SELECT format_type(a.atttypid,a.atttypmod) INTO STRICT parent_type FROM pg_attribute a WHERE a.attrelid='"Account"'::regclass AND a.attname='id' AND NOT a.attisdropped;
  IF parent_type NOT IN ('text','uuid') THEN RAISE EXCEPTION 'Unsupported parent ID type: %', parent_type; END IF;
  parent_types := array_append(parent_types,parent_type);
  SELECT format_type(a.atttypid,a.atttypmod) INTO STRICT parent_type FROM pg_attribute a WHERE a.attrelid='"Account"'::regclass AND a.attname='id' AND NOT a.attisdropped;
  IF parent_type NOT IN ('text','uuid') THEN RAISE EXCEPTION 'Unsupported parent ID type: %', parent_type; END IF;
  parent_types := array_append(parent_types,parent_type);
  EXECUTE format('CREATE TABLE "WorkforceHiringRequest" (
  "id" uuid NOT NULL,
  "organizationId" %s NOT NULL,
  "departmentId" uuid NOT NULL,
  "positionId" uuid NOT NULL,
  "candidateAccountId" %s NOT NULL,
  "targetSeatId" uuid,
  "requestedById" %s NOT NULL,
  "reviewedById" %s,
  "status" "WorkforceHiringRequestStatus" DEFAULT ''PENDING_HR_REVIEW''::"WorkforceHiringRequestStatus" NOT NULL,
  "justification" text,
  "reviewNote" text,
  "reviewedAt" timestamp(3) without time zone,
  "assignedAt" timestamp(3) without time zone,
  "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) without time zone NOT NULL,
  "hrReviewedById" %s,
  "source" "WorkforceHiringRequestSource" DEFAULT ''HUMAN_RESOURCES''::"WorkforceHiringRequestSource" NOT NULL,
  "hrVerification" jsonb,
  "hrNote" text,
  "hrReviewedAt" timestamp(3) without time zone
)', parent_types[1], parent_types[2], parent_types[3], parent_types[4], parent_types[5]);
END
$completion$;
CREATE TABLE "WorkforcePosition" (
  "id" uuid NOT NULL,
  "departmentId" uuid NOT NULL,
  "code" text NOT NULL,
  "titleAr" text NOT NULL,
  "titleEn" text NOT NULL,
  "tier" "WorkforcePositionTier" NOT NULL,
  "parentPositionId" uuid,
  "aiEnabled" boolean DEFAULT true NOT NULL,
  "humanEnabled" boolean DEFAULT false NOT NULL,
  "mode" "WorkforceMode" DEFAULT 'AI_ONLY'::"WorkforceMode" NOT NULL,
  "externalLiaisonEligible" boolean DEFAULT false NOT NULL,
  "canManageExternalCenter" boolean DEFAULT false NOT NULL,
  "permissions" jsonb,
  "displayOrder" integer DEFAULT 0 NOT NULL,
  "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) without time zone NOT NULL
);
DO $completion$
DECLARE parent_type text; parent_types text[] := ARRAY[]::text[];
BEGIN
  SELECT format_type(a.atttypid,a.atttypmod) INTO STRICT parent_type FROM pg_attribute a WHERE a.attrelid='"Account"'::regclass AND a.attname='id' AND NOT a.attisdropped;
  IF parent_type NOT IN ('text','uuid') THEN RAISE EXCEPTION 'Unsupported parent ID type: %', parent_type; END IF;
  parent_types := array_append(parent_types,parent_type);
  SELECT format_type(a.atttypid,a.atttypmod) INTO STRICT parent_type FROM pg_attribute a WHERE a.attrelid='"Organization"'::regclass AND a.attname='id' AND NOT a.attisdropped;
  IF parent_type NOT IN ('text','uuid') THEN RAISE EXCEPTION 'Unsupported parent ID type: %', parent_type; END IF;
  parent_types := array_append(parent_types,parent_type);
  EXECUTE format('CREATE TABLE "WorkforceSeat" (
  "id" uuid NOT NULL,
  "positionId" uuid NOT NULL,
  "accountId" %s,
  "organizationId" %s,
  "scope" "WorkforceSeatScope" DEFAULT ''HEADQUARTERS''::"WorkforceSeatScope" NOT NULL,
  "accessStatus" "WorkforceSeatAccessStatus" DEFAULT ''LOCKED''::"WorkforceSeatAccessStatus" NOT NULL,
  "label" text,
  "administrativeManagerSeatId" uuid,
  "technicalDepartmentId" uuid,
  "enabledAt" timestamp(3) without time zone,
  "disabledAt" timestamp(3) without time zone,
  "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp(3) without time zone NOT NULL
)', parent_types[1], parent_types[2]);
END
$completion$;
ALTER TABLE "ComplianceAssessment" ADD CONSTRAINT "ComplianceAssessment_assessedByAccountId_fkey" FOREIGN KEY ("assessedByAccountId") REFERENCES "Account"(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE "ComplianceAssessment" ADD CONSTRAINT "ComplianceAssessment_pkey" PRIMARY KEY (id);
ALTER TABLE "ComplianceAssessment" ADD CONSTRAINT "ComplianceAssessment_safetyChecklistId_fkey" FOREIGN KEY ("safetyChecklistId") REFERENCES "SafetyChecklist"(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE "ComplianceAssessment" ADD CONSTRAINT "ComplianceAssessment_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "ComplianceEvidence" ADD CONSTRAINT "ComplianceEvidence_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "ComplianceAssessment"(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "ComplianceEvidence" ADD CONSTRAINT "ComplianceEvidence_pkey" PRIMARY KEY (id);
ALTER TABLE "TrainingCourse" ADD CONSTRAINT "TrainingCourse_instructorAccountId_fkey" FOREIGN KEY ("instructorAccountId") REFERENCES "Account"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "TrainingCourse" ADD CONSTRAINT "TrainingCourse_pkey" PRIMARY KEY (id);
ALTER TABLE "WorkforceCenterDepartment" ADD CONSTRAINT "WorkforceCenterDepartment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "WorkforceDepartment"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "WorkforceCenterDepartment" ADD CONSTRAINT "WorkforceCenterDepartment_maxLevel_check" CHECK ("maxLevel" = ANY (ARRAY['L1'::text, 'L2'::text, 'L3'::text, 'L4'::text]));
ALTER TABLE "WorkforceCenterDepartment" ADD CONSTRAINT "WorkforceCenterDepartment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "WorkforceCenterDepartment" ADD CONSTRAINT "WorkforceCenterDepartment_pkey" PRIMARY KEY (id);
ALTER TABLE "WorkforceCenterDepartment" ADD CONSTRAINT "WorkforceCenterDepartment_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "Account"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "WorkforceDepartment" ADD CONSTRAINT "WorkforceDepartment_pkey" PRIMARY KEY (id);
ALTER TABLE "WorkforceHiringRequest" ADD CONSTRAINT "WorkforceHiringRequest_candidateAccountId_fkey" FOREIGN KEY ("candidateAccountId") REFERENCES "Account"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "WorkforceHiringRequest" ADD CONSTRAINT "WorkforceHiringRequest_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "WorkforceDepartment"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "WorkforceHiringRequest" ADD CONSTRAINT "WorkforceHiringRequest_hrReviewedById_fkey" FOREIGN KEY ("hrReviewedById") REFERENCES "Account"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "WorkforceHiringRequest" ADD CONSTRAINT "WorkforceHiringRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "WorkforceHiringRequest" ADD CONSTRAINT "WorkforceHiringRequest_pkey" PRIMARY KEY (id);
ALTER TABLE "WorkforceHiringRequest" ADD CONSTRAINT "WorkforceHiringRequest_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "WorkforcePosition"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "WorkforceHiringRequest" ADD CONSTRAINT "WorkforceHiringRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "Account"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "WorkforceHiringRequest" ADD CONSTRAINT "WorkforceHiringRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "Account"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "WorkforceHiringRequest" ADD CONSTRAINT "WorkforceHiringRequest_targetSeatId_fkey" FOREIGN KEY ("targetSeatId") REFERENCES "WorkforceSeat"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "WorkforcePosition" ADD CONSTRAINT "WorkforcePosition_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "WorkforceDepartment"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "WorkforcePosition" ADD CONSTRAINT "WorkforcePosition_parentPositionId_fkey" FOREIGN KEY ("parentPositionId") REFERENCES "WorkforcePosition"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "WorkforcePosition" ADD CONSTRAINT "WorkforcePosition_pkey" PRIMARY KEY (id);
ALTER TABLE "WorkforceSeat" ADD CONSTRAINT "WorkforceSeat_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "WorkforceSeat" ADD CONSTRAINT "WorkforceSeat_administrativeManagerSeatId_fkey" FOREIGN KEY ("administrativeManagerSeatId") REFERENCES "WorkforceSeat"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "WorkforceSeat" ADD CONSTRAINT "WorkforceSeat_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "WorkforceSeat" ADD CONSTRAINT "WorkforceSeat_pkey" PRIMARY KEY (id);
ALTER TABLE "WorkforceSeat" ADD CONSTRAINT "WorkforceSeat_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "WorkforcePosition"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "WorkforceSeat" ADD CONSTRAINT "WorkforceSeat_technicalDepartmentId_fkey" FOREIGN KEY ("technicalDepartmentId") REFERENCES "WorkforceDepartment"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
CREATE INDEX "ComplianceAssessment_decision_assessedAt_idx" ON public."ComplianceAssessment" USING btree (decision, "assessedAt");
CREATE INDEX "ComplianceAssessment_safetyChecklistId_idx" ON public."ComplianceAssessment" USING btree ("safetyChecklistId");
CREATE INDEX "ComplianceAssessment_tripId_assessedAt_idx" ON public."ComplianceAssessment" USING btree ("tripId", "assessedAt");
CREATE INDEX "ComplianceEvidence_assessmentId_controlId_idx" ON public."ComplianceEvidence" USING btree ("assessmentId", "controlId");
CREATE INDEX "ComplianceEvidence_controlId_verified_idx" ON public."ComplianceEvidence" USING btree ("controlId", verified);
CREATE INDEX "TrainingCourse_instructorAccountId_status_idx" ON public."TrainingCourse" USING btree ("instructorAccountId", status);
CREATE INDEX "TrainingCourse_status_createdAt_idx" ON public."TrainingCourse" USING btree (status, "createdAt");
CREATE INDEX "WorkforceCenterDepartment_departmentId_status_idx" ON public."WorkforceCenterDepartment" USING btree ("departmentId", status);
CREATE INDEX "WorkforceCenterDepartment_org_status_level_idx" ON public."WorkforceCenterDepartment" USING btree ("organizationId", status, "maxLevel");
CREATE UNIQUE INDEX "WorkforceCenterDepartment_organizationId_departmentId_key" ON public."WorkforceCenterDepartment" USING btree ("organizationId", "departmentId");
CREATE INDEX "WorkforceCenterDepartment_organizationId_status_idx" ON public."WorkforceCenterDepartment" USING btree ("organizationId", status);
CREATE UNIQUE INDEX "WorkforceDepartment_code_key" ON public."WorkforceDepartment" USING btree (code);
CREATE INDEX "WorkforceDepartment_status_displayOrder_idx" ON public."WorkforceDepartment" USING btree (status, "displayOrder");
CREATE INDEX "WorkforceHiringRequest_candidateAccountId_status_idx" ON public."WorkforceHiringRequest" USING btree ("candidateAccountId", status);
CREATE INDEX "WorkforceHiringRequest_hrReviewedById_status_idx" ON public."WorkforceHiringRequest" USING btree ("hrReviewedById", status);
CREATE INDEX "WorkforceHiringRequest_organizationId_departmentId_status_idx" ON public."WorkforceHiringRequest" USING btree ("organizationId", "departmentId", status);
CREATE INDEX "WorkforceHiringRequest_status_createdAt_idx" ON public."WorkforceHiringRequest" USING btree (status, "createdAt");
CREATE UNIQUE INDEX "WorkforcePosition_code_key" ON public."WorkforcePosition" USING btree (code);
CREATE INDEX "WorkforcePosition_departmentId_tier_displayOrder_idx" ON public."WorkforcePosition" USING btree ("departmentId", tier, "displayOrder");
CREATE INDEX "WorkforcePosition_parentPositionId_idx" ON public."WorkforcePosition" USING btree ("parentPositionId");
CREATE INDEX "WorkforceSeat_accountId_accessStatus_idx" ON public."WorkforceSeat" USING btree ("accountId", "accessStatus");
CREATE INDEX "WorkforceSeat_administrativeManagerSeatId_idx" ON public."WorkforceSeat" USING btree ("administrativeManagerSeatId");
CREATE UNIQUE INDEX "WorkforceSeat_one_external_position_per_center_key" ON public."WorkforceSeat" USING btree ("positionId", "organizationId") WHERE (scope = 'EXTERNAL_CENTER'::"WorkforceSeatScope");
CREATE UNIQUE INDEX "WorkforceSeat_one_headquarters_position_key" ON public."WorkforceSeat" USING btree ("positionId") WHERE ((scope = 'HEADQUARTERS'::"WorkforceSeatScope") AND ("organizationId" IS NULL));
CREATE INDEX "WorkforceSeat_organizationId_scope_accessStatus_idx" ON public."WorkforceSeat" USING btree ("organizationId", scope, "accessStatus");
CREATE INDEX "WorkforceSeat_positionId_accessStatus_idx" ON public."WorkforceSeat" USING btree ("positionId", "accessStatus");
CREATE INDEX "WorkforceSeat_technicalDepartmentId_idx" ON public."WorkforceSeat" USING btree ("technicalDepartmentId");
