import {BadRequestException,ForbiddenException,Injectable,NotFoundException} from '@nestjs/common';
import {AuditService} from '../audit/audit.service';
import {DatabaseService} from '../database/database.service';

type VerificationSource='SWSDF'|'PADI'|'SSI'|'NAUI'|'RAID'|'SDI'|'TDI'|'IANTD'|'GUE'|'CMAS'|'BSAC';
type VerificationMethod='PRO_LICENSE_VALIDATION'|'ECARD'|'QR'|'ONLINE_DIVER_VERIFY'|'DIVER_LOOKUP'|'CERTIFICATION_SEARCH'|'DIGITAL_CERT'|'VERIFY_CARD'|'CMAS_CERT_SEARCH'|'DIGITAL_QCARD';

type EvidenceInput={source:VerificationSource;method:VerificationMethod;reference:string;verificationUrl?:string;checkedAt?:string};

type CatalogEntry={
  source:VerificationSource;
  name:string;
  scope:string[];
  methods:VerificationMethod[];
  verificationUrl:string;
  allowedHosts:string[];
  saudiEvidence:string;
};

@Injectable()
export class CertificationVerificationEvidenceService{
  constructor(private readonly db:DatabaseService,private readonly audit:AuditService){}

  private readonly catalog:CatalogEntry[]=[
    {source:'SWSDF',name:'Saudi Water Sports and Diving Federation',scope:['SAUDI_PROFESSIONAL_LICENSE'],methods:['PRO_LICENSE_VALIDATION'],verificationUrl:'https://swsdf.sa/diving/license-validation',allowedHosts:['swsdf.sa'],saudiEvidence:'National professional diver licensing authority in Saudi Arabia.'},
    {source:'PADI',name:'Professional Association of Diving Instructors',scope:['RECREATIONAL','PROFESSIONAL','TECHNICAL'],methods:['ECARD'],verificationUrl:'https://www.padi.com/',allowedHosts:['padi.com'],saudiEvidence:'Official PADI dive-shop directory lists Saudi Arabia.'},
    {source:'SSI',name:'Scuba Schools International',scope:['RECREATIONAL','PROFESSIONAL','TECHNICAL','FREEDIVING'],methods:['QR'],verificationUrl:'https://www.divessi.com/',allowedHosts:['divessi.com'],saudiEvidence:'Official SSI directory lists Saudi dive centers.'},
    {source:'NAUI',name:'National Association of Underwater Instructors',scope:['RECREATIONAL','PROFESSIONAL'],methods:['ONLINE_DIVER_VERIFY'],verificationUrl:'https://www.naui.org/services/verify-diver-certification/',allowedHosts:['naui.org'],saudiEvidence:'Supported for official certification verification; Saudi professional licensing remains subject to SWSDF.'},
    {source:'RAID',name:'Dive RAID International',scope:['RECREATIONAL','PROFESSIONAL','TECHNICAL','FREEDIVING'],methods:['DIVER_LOOKUP'],verificationUrl:'https://diveraid.com/find-a-dive-centre/',allowedHosts:['diveraid.com'],saudiEvidence:'Official RAID locator includes Saudi Arabia and diver/instructor lookup.'},
    {source:'SDI',name:'Scuba Diving International',scope:['RECREATIONAL','PROFESSIONAL'],methods:['CERTIFICATION_SEARCH'],verificationUrl:'https://www.tdisdi.com/cert-search/',allowedHosts:['tdisdi.com'],saudiEvidence:'International Training lists a Saudi Arabia regional representative.'},
    {source:'TDI',name:'Technical Diving International',scope:['TECHNICAL','PROFESSIONAL'],methods:['CERTIFICATION_SEARCH'],verificationUrl:'https://www.tdisdi.com/cert-search/',allowedHosts:['tdisdi.com'],saudiEvidence:'International Training lists a Saudi Arabia regional representative.'},
    {source:'IANTD',name:'International Association of Nitrox and Technical Divers',scope:['RECREATIONAL','TECHNICAL','PROFESSIONAL'],methods:['DIGITAL_CERT'],verificationUrl:'https://www.iantd.com/',allowedHosts:['iantd.com'],saudiEvidence:'IANTD Arabia officially covers Saudi Arabia.'},
    {source:'GUE',name:'Global Underwater Explorers',scope:['RECREATIONAL','TECHNICAL','CAVE','PROFESSIONAL'],methods:['VERIFY_CARD'],verificationUrl:'https://www.gue.com/verifycard',allowedHosts:['gue.com'],saudiEvidence:'Official GUE instructor directory lists instructors serving Saudi Arabia.'},
    {source:'CMAS',name:'World Underwater Federation (CMAS)',scope:['RECREATIONAL','SPORT','TECHNICAL'],methods:['CMAS_CERT_SEARCH'],verificationUrl:'https://portal.cmas.org/certifications',allowedHosts:['cmas.org'],saudiEvidence:'Saudi Water Sports and Diving Federation is the CMAS national federation for Saudi Arabia.'},
    {source:'BSAC',name:'British Sub-Aqua Club',scope:['RECREATIONAL','PROFESSIONAL'],methods:['DIGITAL_QCARD'],verificationUrl:'https://www.bsac.com/mybsac/mybsac-guide/mybsac-digital-cards/',allowedHosts:['bsac.com'],saudiEvidence:'BSAC training operations are available on Saudi Red Sea itineraries; qualifications are evidenced through MyBSAC/QCard.'},
  ];

  list(){return this.catalog.map(({allowedHosts,...entry})=>entry);}

  async record(reviewerAccountId:string,credentialId:string,input:EvidenceInput){
    const entry=this.catalog.find(item=>item.source===String(input.source||'').trim().toUpperCase());
    if(!entry)throw new BadRequestException('Unsupported diving certification organization.');
    const method=String(input.method||'').trim().toUpperCase() as VerificationMethod;
    if(!entry.methods.includes(method))throw new BadRequestException('Verification method does not match the selected organization.');
    const reference=String(input.reference||'').trim();
    if(reference.length<3||reference.length>200)throw new BadRequestException('Verification reference must be between 3 and 200 characters.');
    const checkedAt=input.checkedAt?new Date(input.checkedAt):new Date();
    if(Number.isNaN(checkedAt.getTime()))throw new BadRequestException('Invalid verification time.');
    if(checkedAt.getTime()>Date.now()+5*60_000)throw new BadRequestException('Verification time cannot be in the future.');
    const [credential,reviewer]=await Promise.all([
      this.db.credential.findUnique({where:{id:credentialId},select:{id:true,personId:true,verificationStatus:true,issuer:true,title:true}}),
      this.db.account.findUnique({where:{id:reviewerAccountId},select:{personId:true}}),
    ]);
    if(!credential||credential.verificationStatus!=='PENDING')throw new NotFoundException('Credential is not awaiting review.');
    if(!reviewer)throw new NotFoundException('Reviewer account not found.');
    if(reviewer.personId===credential.personId)throw new ForbiddenException('Reviewers cannot verify their own credential evidence.');
    const verificationUrl=this.url(input.verificationUrl||entry.verificationUrl,entry.allowedHosts);
    const evidence={source:entry.source,organization:entry.name,method,reference,verificationUrl,checkedAt:checkedAt.toISOString(),scope:entry.scope,saudiEvidence:entry.saudiEvidence};
    await this.audit.record({actorId:reviewerAccountId,action:'CREDENTIAL_EXTERNAL_VERIFICATION_EVIDENCE_RECORDED',resource:'Credential',resourceId:credentialId,metadata:{reviewerAccountId,credentialIssuer:credential.issuer,credentialTitle:credential.title,evidence}});
    return{credentialId,evidence,decisionRequired:true};
  }

  async assertRecorded(reviewerAccountId:string,credentialId:string){
    const reviewer=await this.db.account.findUnique({where:{id:reviewerAccountId},select:{personId:true}});
    if(!reviewer)throw new NotFoundException('Reviewer account not found.');
    const evidence=await this.db.auditEvent.findFirst({where:{action:'CREDENTIAL_EXTERNAL_VERIFICATION_EVIDENCE_RECORDED',resource:'Credential',resourceId:credentialId,actorId:reviewer.personId},orderBy:{occurredAt:'desc'},select:{id:true,occurredAt:true}});
    if(!evidence)throw new BadRequestException('Official external certification verification evidence must be recorded before approval.');
    return evidence;
  }

  private url(value:string,allowedHosts:string[]){
    let url:URL;try{url=new URL(value.trim());}catch{throw new BadRequestException('Invalid official verification URL.');}
    if(url.protocol!=='https:'||url.username||url.password)throw new BadRequestException('Official verification URL must use HTTPS without embedded credentials.');
    const host=url.hostname.toLowerCase();
    if(!allowedHosts.some(root=>host===root||host.endsWith('.'+root)))throw new BadRequestException('Verification URL does not match the selected organization official domain.');
    url.hash='';return url.toString();
  }
}
