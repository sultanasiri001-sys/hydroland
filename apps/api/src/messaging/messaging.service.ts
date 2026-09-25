import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';

type CreateConversationInput={participantAccountIds?:unknown;title?:unknown};
type SendMessageInput={kind?:unknown;body?:unknown;mediaUrl?:unknown;durationSec?:unknown};
type ConversationRow={id:string;title:string|null;createdByAccountId:string;createdAt:Date;updatedAt:Date};
type ParticipantRow={conversationId:string;accountId:string;email:string;firstName:string;lastName:string;joinedAt:Date;lastReadAt:Date|null};
type MessageRow={id:string;conversationId:string;senderAccountId:string;senderEmail:string;senderFirstName:string;senderLastName:string;kind:'TEXT'|'VOICE';body:string|null;mediaUrl:string|null;durationSec:number|null;createdAt:Date};

@Injectable()
export class MessagingService {
  constructor(private readonly db:DatabaseService,private readonly notifications:NotificationsService){}

  async listConversations(accountId:string){
    const conversations=await this.db.$queryRaw<ConversationRow[]>(Prisma.sql`
      SELECT c."id",c."title",c."createdByAccountId",c."createdAt",c."updatedAt"
      FROM "Conversation" c
      INNER JOIN "ConversationParticipant" cp ON cp."conversationId"=c."id"
      WHERE cp."accountId"=${accountId}
      ORDER BY COALESCE((SELECT MAX(m."createdAt") FROM "Message" m WHERE m."conversationId"=c."id"),c."createdAt") DESC
      LIMIT 100
    `);
    if(!conversations.length)return[];
    return Promise.all(conversations.map(async conversation=>{
      const participants=await this.participants(conversation.id);
      const latest=(await this.db.$queryRaw<MessageRow[]>(Prisma.sql`
        SELECT m."id",m."conversationId",m."senderAccountId",a."email" AS "senderEmail",p."firstName" AS "senderFirstName",p."lastName" AS "senderLastName",m."kind",m."body",m."mediaUrl",m."durationSec",m."createdAt"
        FROM "Message" m JOIN "Account" a ON a."id"=m."senderAccountId" JOIN "Person" p ON p."id"=a."personId"
        WHERE m."conversationId"=${conversation.id} ORDER BY m."createdAt" DESC LIMIT 1
      `))[0]??null;
      return{...conversation,participants,latestMessage:latest};
    }));
  }

  async createConversation(accountId:string,input:CreateConversationInput){
    const participantIds=this.participantIds(input.participantAccountIds,accountId);
    const title=this.title(input.title);
    const allIds=[accountId,...participantIds];
    const valid=await this.db.$queryRaw<Array<{id:string}>>(Prisma.sql`
      SELECT "id" FROM "Account" WHERE "id" IN (${Prisma.join(allIds)}) AND "status"='ACTIVE' AND "emailVerifiedAt" IS NOT NULL
    `);
    if(valid.length!==allIds.length)throw new BadRequestException('One or more participant accounts are unavailable.');
    const conversationId=await this.db.serializable(async tx=>{
      const rows=await tx.$queryRaw<Array<{id:string}>>(Prisma.sql`
        INSERT INTO "Conversation" ("title","createdByAccountId") VALUES (${title},${accountId}) RETURNING "id"
      `);
      const id=rows[0]?.id;if(!id)throw new Error('Conversation creation failed.');
      for(const participantId of allIds){
        await tx.$executeRaw(Prisma.sql`INSERT INTO "ConversationParticipant" ("conversationId","accountId") VALUES (${id},${participantId})`);
      }
      return id;
    });
    return this.getConversation(accountId,conversationId);
  }

  async getConversation(accountId:string,conversationId:string){
    await this.requireParticipant(accountId,conversationId);
    const conversation=(await this.db.$queryRaw<ConversationRow[]>(Prisma.sql`
      SELECT "id","title","createdByAccountId","createdAt","updatedAt" FROM "Conversation" WHERE "id"=${conversationId} LIMIT 1
    `))[0];
    if(!conversation)throw new NotFoundException('Conversation not found.');
    const [participants,messages]=await Promise.all([this.participants(conversationId),this.messages(conversationId)]);
    return{...conversation,participants,messages};
  }

  async sendMessage(accountId:string,conversationId:string,input:SendMessageInput){
    await this.requireParticipant(accountId,conversationId);
    const payload=this.messagePayload(input);
    const rows=await this.db.$queryRaw<Array<{id:string}>>(Prisma.sql`
      INSERT INTO "Message" ("conversationId","senderAccountId","kind","body","mediaUrl","durationSec")
      VALUES (${conversationId},${accountId},${payload.kind},${payload.body},${payload.mediaUrl},${payload.durationSec}) RETURNING "id"
    `);
    const messageId=rows[0]?.id;if(!messageId)throw new Error('Message creation failed.');
    await this.db.$executeRaw(Prisma.sql`UPDATE "Conversation" SET "updatedAt"=NOW() WHERE "id"=${conversationId}`);
    const recipients=await this.db.$queryRaw<Array<{accountId:string}>>(Prisma.sql`
      SELECT "accountId" FROM "ConversationParticipant" WHERE "conversationId"=${conversationId} AND "accountId"<>${accountId}
    `);
    await Promise.allSettled(recipients.map(row=>this.notifications.notify(row.accountId,'MESSAGE_RECEIVED',{conversationId,messageId,kind:payload.kind})));
    return this.messageById(messageId);
  }

  async markRead(accountId:string,conversationId:string){
    await this.requireParticipant(accountId,conversationId);
    await this.db.$executeRaw(Prisma.sql`
      UPDATE "ConversationParticipant" SET "lastReadAt"=NOW() WHERE "conversationId"=${conversationId} AND "accountId"=${accountId}
    `);
    return{conversationId,status:'READ'};
  }

  private async requireParticipant(accountId:string,conversationId:string){
    const rows=await this.db.$queryRaw<Array<{ok:number}>>(Prisma.sql`
      SELECT 1 AS "ok" FROM "ConversationParticipant" WHERE "conversationId"=${conversationId} AND "accountId"=${accountId} LIMIT 1
    `);
    if(!rows.length)throw new ForbiddenException('Conversation access denied.');
  }

  private participants(conversationId:string){return this.db.$queryRaw<ParticipantRow[]>(Prisma.sql`
    SELECT cp."conversationId",cp."accountId",a."email",p."firstName",p."lastName",cp."joinedAt",cp."lastReadAt"
    FROM "ConversationParticipant" cp JOIN "Account" a ON a."id"=cp."accountId" JOIN "Person" p ON p."id"=a."personId"
    WHERE cp."conversationId"=${conversationId} ORDER BY cp."joinedAt" ASC
  `)}

  private messages(conversationId:string){return this.db.$queryRaw<MessageRow[]>(Prisma.sql`
    SELECT m."id",m."conversationId",m."senderAccountId",a."email" AS "senderEmail",p."firstName" AS "senderFirstName",p."lastName" AS "senderLastName",m."kind",m."body",m."mediaUrl",m."durationSec",m."createdAt"
    FROM "Message" m JOIN "Account" a ON a."id"=m."senderAccountId" JOIN "Person" p ON p."id"=a."personId"
    WHERE m."conversationId"=${conversationId} ORDER BY m."createdAt" ASC LIMIT 200
  `)}

  private async messageById(messageId:string){const row=(await this.db.$queryRaw<MessageRow[]>(Prisma.sql`
    SELECT m."id",m."conversationId",m."senderAccountId",a."email" AS "senderEmail",p."firstName" AS "senderFirstName",p."lastName" AS "senderLastName",m."kind",m."body",m."mediaUrl",m."durationSec",m."createdAt"
    FROM "Message" m JOIN "Account" a ON a."id"=m."senderAccountId" JOIN "Person" p ON p."id"=a."personId" WHERE m."id"=${messageId} LIMIT 1
  `))[0];if(!row)throw new NotFoundException('Message not found.');return row;}

  private participantIds(value:unknown,accountId:string){
    if(!Array.isArray(value)||!value.length||value.length>20)throw new BadRequestException('participantAccountIds must contain 1-20 accounts.');
    const ids=[...new Set(value.map(v=>typeof v==='string'?v.trim():'').filter(Boolean))].filter(id=>id!==accountId);
    if(!ids.length)throw new BadRequestException('At least one other participant is required.');
    return ids;
  }
  private title(value:unknown){if(value===undefined||value===null||value==='')return null;if(typeof value!=='string')throw new BadRequestException('title must be text.');const title=value.trim();if(!title||title.length>120)throw new BadRequestException('title must be 1-120 characters.');return title;}
  private messagePayload(input:SendMessageInput){
    const kind=input.kind===undefined?'TEXT':String(input.kind).toUpperCase();
    if(kind==='TEXT'){
      if(typeof input.body!=='string')throw new BadRequestException('Text message body is required.');const body=input.body.trim();if(!body||body.length>4000)throw new BadRequestException('Text message must be 1-4000 characters.');
      return{kind:'TEXT',body,mediaUrl:null,durationSec:null};
    }
    if(kind==='VOICE'){
      if(typeof input.mediaUrl!=='string'||!/^https:\/\/\S+$/.test(input.mediaUrl.trim()))throw new BadRequestException('Voice message requires an HTTPS mediaUrl.');
      const durationSec=Number(input.durationSec);if(!Number.isInteger(durationSec)||durationSec<1||durationSec>600)throw new BadRequestException('Voice durationSec must be 1-600.');
      return{kind:'VOICE',body:null,mediaUrl:input.mediaUrl.trim(),durationSec};
    }
    throw new BadRequestException('Unsupported message kind.');
  }
}
