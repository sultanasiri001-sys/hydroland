import { Injectable } from '@nestjs/common';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { join } from 'path';
export interface PrivateObjectStorage{put(data:Buffer):Promise<string>;get(key:string):Promise<Buffer>;delete(key:string):Promise<void>;}
@Injectable()
export class LocalPrivateObjectStorage implements PrivateObjectStorage{
 private readonly root=process.env.PRIVATE_STORAGE_DIR||'/tmp/hydroland-private';
 async put(data:Buffer){await mkdir(this.root,{recursive:true,mode:0o700});const key=randomUUID();await writeFile(join(this.root,key),data,{mode:0o600});return key;}
 async get(key:string){return readFile(join(this.root,key));}
 async delete(key:string){await unlink(join(this.root,key)).catch(()=>undefined);}
}
