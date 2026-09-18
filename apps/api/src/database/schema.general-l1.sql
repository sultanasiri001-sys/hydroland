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
