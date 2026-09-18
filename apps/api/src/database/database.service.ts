import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient, QueryResultRow } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool = new Pool({ connectionString: process.env.DATABASE_URL });
  query<T extends QueryResultRow = QueryResultRow>(text:string, values:unknown[] = []) { return this.pool.query<T>(text, values); }
  async transaction<T>(work:(client:PoolClient)=>Promise<T>):Promise<T> {
    const client=await this.pool.connect();
    try { await client.query('BEGIN'); const result=await work(client); await client.query('COMMIT'); return result; }
    catch(error){ await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
  async onModuleDestroy(){ await this.pool.end(); }
}
