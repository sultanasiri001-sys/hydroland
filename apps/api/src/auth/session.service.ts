import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { DatabaseService } from '../database/database.service';

export interface Session {
  id: string;
  accountId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

interface SessionRow {
  id: string;
  account_id: string;
  token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
}

@Injectable()
export class SessionService {
  constructor(private readonly db: DatabaseService) {}

  async issue(accountId: string, ttlMs = 1000 * 60 * 60 * 8): Promise<{ token:string; session:Session }> {
    const id = randomUUID();
    const token = randomBytes(32).toString('base64url');
    const tokenHash = this.hash(token);
    const expiresAt = new Date(Date.now() + ttlMs);
    const result = await this.db.query<SessionRow>(
      `INSERT INTO sessions (id, account_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id, account_id, token_hash, expires_at, revoked_at`,
      [id, accountId, tokenHash, expiresAt],
    );
    return { token, session:this.map(result.rows[0]) };
  }

  async validate(token: string): Promise<Session> {
    const result = await this.db.query<SessionRow>(
      `SELECT s.id, s.account_id, s.token_hash, s.expires_at, s.revoked_at
       FROM sessions s JOIN accounts a ON a.id=s.account_id
       WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now() AND a.status='ACTIVE'
       LIMIT 1`,
      [this.hash(token)],
    );
    if (!result.rows[0]) throw new UnauthorizedException('Invalid or expired session');
    return this.map(result.rows[0]);
  }

  async revoke(token: string): Promise<void> {
    await this.db.query(
      `UPDATE sessions SET revoked_at = now()
       WHERE token_hash = $1 AND revoked_at IS NULL`,
      [this.hash(token)],
    );
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private map(row: SessionRow): Session {
    return {
      id: row.id,
      accountId: row.account_id,
      tokenHash: row.token_hash,
      expiresAt: new Date(row.expires_at),
      revokedAt: row.revoked_at ? new Date(row.revoked_at) : null,
    };
  }
}
