import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';

export interface Session {
  id: string; accountId: string; tokenHash: string; expiresAt: Date; revokedAt: Date | null;
}
@Injectable()
export class SessionService {
  private readonly sessions = new Map<string, Session>();
  issue(accountId: string, token: string, ttlMs = 1000 * 60 * 60 * 8): Session {
    const session: Session = { id: randomUUID(), accountId, tokenHash: this.hash(token), expiresAt: new Date(Date.now()+ttlMs), revokedAt:null };
    this.sessions.set(session.tokenHash, session); return session;
  }
  validate(token: string): Session {
    const session=this.sessions.get(this.hash(token));
    if(!session || session.revokedAt || session.expiresAt.getTime()<=Date.now()) throw new UnauthorizedException('Invalid or expired session');
    return session;
  }
  revoke(token: string) { const s=this.sessions.get(this.hash(token)); if(s) s.revokedAt=new Date(); }
  private hash(v:string){ return createHash('sha256').update(v).digest('hex'); }
}
