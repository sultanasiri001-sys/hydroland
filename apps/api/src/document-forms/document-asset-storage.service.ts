import { Injectable, NotFoundException } from '@nestjs/common';

export interface DocumentAssetStorage {
  put(storageKey:string,bytes:Buffer,mimeType:string):Promise<void>;
  get(storageKey:string):Promise<Buffer>;
}

@Injectable()
export class LocalDocumentAssetStorage implements DocumentAssetStorage {
  private readonly root=process.env.DOCUMENT_ASSET_STORAGE_PATH?.trim();

  async put(storageKey:string,bytes:Buffer,_mimeType:string){
    if(!this.root) throw new Error('DOCUMENT_ASSET_STORAGE_PATH is not configured.');
    const {mkdir,writeFile}=await import('node:fs/promises');
    const {dirname,join}=await import('node:path');
    const path=join(this.root,this.safe(storageKey));
    await mkdir(dirname(path),{recursive:true});
    await writeFile(path,bytes,{flag:'wx'});
  }

  async get(storageKey:string){
    if(!this.root) throw new Error('DOCUMENT_ASSET_STORAGE_PATH is not configured.');
    const {readFile}=await import('node:fs/promises');
    const {join}=await import('node:path');
    try{return await readFile(join(this.root,this.safe(storageKey)));}
    catch(e:any){if(e?.code==='ENOENT')throw new NotFoundException('Document asset bytes were not found.');throw e;}
  }

  private safe(key:string){
    if(!/^[A-Za-z0-9][A-Za-z0-9/_-]*\.[A-Za-z0-9]+$/.test(key)||key.includes('..')) throw new Error('Unsafe document asset storage key.');
    return key;
  }
}
