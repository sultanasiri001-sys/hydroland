import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';

type GoogleIdentity={subject:string;email:string;givenName:string;familyName:string;hostedDomain:string|null};

@Injectable()
export class GoogleIdentityService{
  private readonly client=new OAuth2Client();

  config(){const clientId=(process.env.GOOGLE_CLIENT_ID||'').trim();return{enabled:Boolean(clientId),clientId:clientId||null}}

  async verifyCredential(credential:string):Promise<GoogleIdentity>{
    const clientId=(process.env.GOOGLE_CLIENT_ID||'').trim();
    if(!clientId)throw new ServiceUnavailableException('Google sign-in is not configured.');
    if(typeof credential!=='string'||credential.trim().length<100)throw new UnauthorizedException('Invalid Google credential.');
    try{
      const ticket=await this.client.verifyIdToken({idToken:credential.trim(),audience:clientId});
      const payload=ticket.getPayload();
      const subject=typeof payload?.sub==='string'?payload.sub.trim():'';
      const email=typeof payload?.email==='string'?payload.email.trim().toLowerCase():'';
      const hostedDomain=typeof payload?.hd==='string'&&payload.hd.trim()?payload.hd.trim().toLowerCase():null;
      const authoritative=email.endsWith('@gmail.com')||(payload?.email_verified===true&&Boolean(hostedDomain));
      if(!subject||!email||payload?.email_verified!==true||!authoritative)throw new UnauthorizedException('Use a verified Gmail or Google Workspace account.');
      return{subject,email,givenName:this.name(payload?.given_name,'Google'),familyName:this.name(payload?.family_name,'Member'),hostedDomain};
    }catch(error){
      if(error instanceof UnauthorizedException)throw error;
      throw new UnauthorizedException('Google identity verification failed.');
    }
  }

  private name(value:unknown,fallback:string){const clean=typeof value==='string'?value.trim().replace(/[\u0000-\u001f\u007f]/g,'').slice(0,80):'';return clean||fallback}
}
