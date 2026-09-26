import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

export type PadiEcardEvidenceDescriptor={
  provider:'PADI';
  evidenceType:'ECARD_VERIFICATION_LINK';
  sourceHost:'livewebservices.padi.com';
  pathVersion:'v4';
  evidenceFingerprint:string;
  humanReviewRequired:true;
  apiVerified:false;
};

@Injectable()
export class PadiEcardEvidenceService {
  validateVerificationUrl(input:string):PadiEcardEvidenceDescriptor{
    const raw=input?.trim();
    if(!raw||raw.length>2048)throw new BadRequestException('Invalid PADI eCard verification link.');
    let url:URL;
    try{url=new URL(raw);}catch{throw new BadRequestException('Invalid PADI eCard verification link.');}
    if(url.protocol!=='https:'||url.hostname.toLowerCase()!=='livewebservices.padi.com')throw new BadRequestException('PADI eCard evidence must use the official HTTPS verification host.');
    if(url.username||url.password||url.port)throw new BadRequestException('PADI eCard verification link contains unsupported authority data.');
    if(!/^\/ecard-webservices\/v4\/ecardVerify\/?$/i.test(url.pathname))throw new BadRequestException('Unsupported PADI eCard verification path.');
    const acid=url.searchParams.get('acid')?.trim();
    const at=url.searchParams.get('at')?.trim();
    if(!acid||!at)throw new BadRequestException('PADI eCard verification link is incomplete.');
    if(acid.length>512||at.length>64)throw new BadRequestException('PADI eCard verification link is invalid.');
    const canonical=new URL(url.toString());
    canonical.hash='';
    const evidenceFingerprint=createHash('sha256').update(canonical.toString()).digest('hex');
    return{
      provider:'PADI',
      evidenceType:'ECARD_VERIFICATION_LINK',
      sourceHost:'livewebservices.padi.com',
      pathVersion:'v4',
      evidenceFingerprint,
      humanReviewRequired:true,
      apiVerified:false,
    };
  }
}
