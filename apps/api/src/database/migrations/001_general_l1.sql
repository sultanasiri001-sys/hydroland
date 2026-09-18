-- GENERAL-L1 canonical migration. Apply once to an empty PostgreSQL database.
-- GENERAL-L1 canonical relational schema (PostgreSQL)
CREATE TABLE accounts (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING','ACTIVE','SUSPENDED','DISABLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE organization_nodes (
  id UUID PRIMARY KEY,
  parent_id UUID REFERENCES organization_nodes(id),
  node_type TEXT NOT NULL CHECK (node_type IN ('HQ','REGION','CENTER','DEPARTMENT','UNIT','TEAM')),
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE roles (
  id UUID PRIMARY KEY,
  role_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE permissions (
  id UUID PRIMARY KEY,
  permission_key TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id),
  permission_id UUID NOT NULL REFERENCES permissions(id),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE account_role_grants (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id),
  role_id UUID NOT NULL REFERENCES roles(id),
  scope_type TEXT NOT NULL CHECK (scope_type IN ('GLOBAL','REGION','CENTER','DEPARTMENT','SELF')),
  scope_id UUID,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE','SUSPENDED','REVOKED')),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_events (
  id UUID PRIMARY KEY,
  actor_account_id UUID REFERENCES accounts(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  scope_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_org_parent ON organization_nodes(parent_id);
CREATE INDEX idx_grants_account ON account_role_grants(account_id, status);
CREATE INDEX idx_sessions_account ON sessions(account_id);
CREATE INDEX idx_audit_resource ON audit_events(resource_type, resource_id);
CREATE INDEX idx_audit_actor ON audit_events(actor_account_id, occurred_at);

-- GENERAL-L1 transactional extensions
CREATE TABLE approval_requests (
 id UUID PRIMARY KEY, requester_account_id UUID NOT NULL REFERENCES accounts(id), scope_id UUID NOT NULL,
 status TEXT NOT NULL, reviewer_account_id UUID REFERENCES accounts(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE notification_outbox (
 id UUID PRIMARY KEY, account_id UUID NOT NULL REFERENCES accounts(id), event_key TEXT NOT NULL,
 payload JSONB NOT NULL DEFAULT '{}'::jsonb, status TEXT NOT NULL CHECK(status IN ('PENDING','SENT','FAILED')),
 attempts INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), sent_at TIMESTAMPTZ
);
CREATE TABLE private_documents (
 id UUID PRIMARY KEY, owner_account_id UUID NOT NULL REFERENCES accounts(id), scope_id UUID NOT NULL,
 storage_key TEXT NOT NULL UNIQUE, sha256 TEXT NOT NULL, mime_type TEXT NOT NULL, size_bytes BIGINT NOT NULL CHECK(size_bytes>0 AND size_bytes<=10485760),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_approval_scope_status ON approval_requests(scope_id,status);
CREATE INDEX idx_outbox_status_created ON notification_outbox(status,created_at);
CREATE INDEX idx_documents_owner_scope ON private_documents(owner_account_id,scope_id);

