import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { DatabaseService } from '../database/database.service';

type Credentials={email:string;password:string};
type Tokens={accessToken:string;refreshToken:string};

@Injectable()
export class AuthService {
  constructor(private readonly db:DatabaseService){}

  async register(input:Credentials){
    const email=this.email(input.email);
    this.password(input.password);
    if(await this.db.account.findUnique({where:{email}}))throw new ConflictException('Account exists.');
    const account=await this.db.account.create({data:{email,passwordHash:this.hash(input.password),person:{create:{firstName:'Pending',lastName:'Profile'}}}});
    return this.issue(account.id);
  }

  async login(input:Credentials){
    const account=await this.db.account.findUnique({where:{email:this.email(input.email)}});
    if(!account||!this.verify(input.password,account.passwordHash)||this.blocked(account.status))throw new UnauthorizedException('Invalid credentials.');
    return this.issue(account.id);
  }

  async refresh(refreshToken:string):Promise<Tokens>{
    const token=this.requireRefreshToken(refreshToken);
    const session=await this.db.session.findUnique({where:{tokenHash:this.tokenHash(token)},include:{account:{select:{status:true}}}});
    if(!session||session.revokedAt||session.expiresAt<=new Date()||this.blocked(session.account.status))throw new UnauthorizedException('Invalid session.');
    await this.db.session.update({where:{id:session.id},data:{revokedAt:new Date()}});
    return this.issue(session.accountId);
  }

  async logout(refreshToken:string):Promise<void>{
    const token=this.requireRefreshToken(refreshToken);
    await this.db.session.updateMany({where:{tokenHash:this.tokenHash(token),revokedAt:null},data:{revokedAt:new Date()}});
  }

  async authenticateAccessToken(token:string){
    const claims=this.verifyAccessToken(token);
    const account=await this.db.account.findUnique({where:{id:claims.accountId},select:{id:true,status:true}});
    if(!account||this.blocked(account.status))throw new UnauthorizedException('Account is not active.');
    return{accountId:account.id};
  }

  private async issue(accountId:string):Promise<Tokens>{
    const refreshToken=randomBytes(48).toString('base64url');
    await this.db.session.create({data:{accountId,tokenHash:this.tokenHash(refreshToken),expiresAt:new Date(Date.now()+2592000000)}});
    return{accessToken:this.access(accountId),refreshToken};
  }

  private access(id:string){
    const secret=process.env.JWT_SECRET;
    if(!secret||secret.length<32)throw new Error('JWT_SECRET required.');
    const now=Math.floor(Date.now()/1000);
    const encode=(value:object)=>Buffer.from(JSON.stringify(value)).toString('base64url');
    const body=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,iat:now,exp:now+900})}`;
    return `${body}.${createHmac('sha256',secret).update(body).digest('base64url')}`;
  }

  verifyAccessToken(token:string){
    if(typeof token!=='string'||token.length<16)throw new UnauthorizedException('Invalid access token.');
    const parts=token.split('.');
    if(parts.length!==3)throw new UnauthorizedException('Invalid access token.');
    const [header,payload,signature]=parts,secret=process.env.JWT_SECRET;
    if(!header||!payload||!signature||!secret)throw new UnauthorizedException('Invalid access token.');
    const expected=createHmac('sha256',secret).update(`${header}.${payload}`).digest('base64url');
    if(signature.length!==expected.length||!timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))throw new UnauthorizedException('Invalid access token.');
    try{
      const claims=JSON.parse(Buffer.from(payload,'base64url').toString()) as{sub?:unknown;exp?:unknown};
      if(typeof claims.sub!=='string'||!claims.sub||typeof claims.exp!=='number'||!Number.isFinite(claims.exp)||claims.exp<=Math.floor(Date.now()/1000))throw new UnauthorizedException('Invalid access token.');
      return{accountId:claims.sub};
    }catch(error){
      if(error instanceof UnauthorizedException)throw error;
      throw new UnauthorizedException('Invalid access token.');
    }
  }

  private requireRefreshToken(value:string){
    if(typeof value!=='string'||value.trim().length<32)throw new UnauthorizedException('Invalid session.');
    return value.trim();
  }

  private blocked(status:string){return status==='SUSPENDED'||status==='ARCHIVED';}
  private email(value:string){const email=value?.trim().toLowerCase();if(!email||!/^\S+@\S+\.\S+$/.test(email))throw new BadRequestException('Valid email required.');return email;}
  private password(value:string){if(!value||value.length<12)throw new BadRequestException('Password min 12.');}
  private hash(value:string){const salt=randomBytes(16).toString('hex');return `${salt}:${scryptSync(value,salt,64).toString('hex')}`;}
  private verify(value:string,encoded:string){
    if(typeof value!=='string'||!value)return false;
    const [salt,digest]=encoded.split(':');
    if(!salt||!digest)return false;
    const expected=Buffer.from(digest,'hex');
    const actual=scryptSync(value,salt,64);
    return expected.length===actual.length&&timingSafeEqual(actual,expected);
  }
  private tokenHash(value:string){return createHash('sha256').update(value).digest('hex');}
}
