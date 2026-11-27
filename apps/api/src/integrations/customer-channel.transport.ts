import { Injectable } from '@nestjs/common';
import { ChannelDispatch, channelPolicy, privateDigest } from '../notifications/customer-channel.domain';
import { UnifonicMessagingService } from './unifonic-messaging.service';

type Policy = NonNullable<ReturnType<typeof channelPolicy>>;
export type ChannelTransportResult = {state:'ACCEPTED'|'PENDING'|'DELIVERED'|'PUSH_CONFIRMED'|'REJECTED'|'UNREGISTERED'|'UNCERTAIN'; providerId?:string};
const providerId = (x:unknown) => typeof x === 'string' && /^[A-Za-z0-9_-]{1,200}$/.test(x) ? x : null;
const expoId = (x:unknown) => typeof x === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(x) ? x.toLowerCase() : null;

@Injectable()
export class CustomerChannelTransport {
  constructor(private readonly messaging: UnifonicMessagingService) {}

  async sendCode(phone: string, code: string, id: string) {
    const receipt = await this.messaging.sendSms({recipient:phone,body:`رمز تأكيد هاتف إشعارات هيدرولاند: ${code}. صالح لعشر دقائق. لا تشاركه مع أي شخص.`,correlationId:'hydroland-phone/'+id});
    return receipt.submission === 'PROVIDER_RECEIPT' && /^[1-9]\d{0,199}$/.test(receipt.providerMessageId || '');
  }

  async send(row: ChannelDispatch, destination: string, policy: Policy): Promise<ChannelTransportResult> {
    const referenceId = 'hydroland-notice/'+row.id;
    if (row.channel === 'SMS') {
      const response = await this.messaging.sendSms({recipient:destination,correlationId:referenceId,
        body:row.event === 'BOOKING_CONFIRMED' ? 'تم تأكيد حجزك في هيدرولاند. سجّل الدخول إلى حسابك لعرض التفاصيل.' : 'صدرت فاتورتك في هيدرولاند. سجّل الدخول إلى حسابك لعرض التفاصيل.'});
      return response.submission === 'PROVIDER_RECEIPT' && /^[1-9]\d{0,199}$/.test(response.providerMessageId || '')
        ? {state:'ACCEPTED',providerId:response.providerMessageId!} : {state:'UNCERTAIN'};
    }
    if (row.channel === 'WHATSAPP') {
      const response = await this.messaging.sendWhatsAppTemplate({recipient:destination,templateName:policy.template!,languageCode:policy.language!,parameters:[],referenceId});
      if(response.status?.toUpperCase()==='REJECTED')return {state:'REJECTED'};
      const id = providerId(response.providerMessageId);
      return id ? {state:'ACCEPTED',providerId:id} : {state:'UNCERTAIN'};
    }
    const response = await this.expo('send',[{to:destination,title:'هيدرولاند',body:'لديك تحديث جديد داخل حسابك في المنصة.',ttl:0}]);
    if (response.errors?.length || !Array.isArray(response.data) || response.data.length !== 1) return {state:'UNCERTAIN'};
    const ticket = response.data[0];
    if (ticket?.status === 'error') return {state:ticket.details?.error === 'DeviceNotRegistered' ? 'UNREGISTERED' : 'REJECTED'};
    const id = expoId(ticket?.id);
    return ticket?.status === 'ok' && id ? {state:'ACCEPTED',providerId:id} : {state:'UNCERTAIN'};
  }

  async receipt(row: ChannelDispatch): Promise<ChannelTransportResult> {
    if (row.channel === 'PUSH') {
      const response = await this.expo('getReceipts',{ids:[row.providerId]});
      const entries = Object.entries(response.data || {});
      if (response.errors?.length || entries.length > 1 || (entries.length === 1 && entries[0][0] !== row.providerId)) return {state:'UNCERTAIN'};
      if (!entries.length) return {state:'PENDING'};
      const receipt = entries[0][1] as {status?:string;details?:{error?:string}};
      if (receipt.status === 'ok') return {state:'PUSH_CONFIRMED'};
      if (receipt.status === 'error') return {state:receipt.details?.error === 'DeviceNotRegistered' ? 'UNREGISTERED' : 'REJECTED'};
      return {state:'UNCERTAIN'};
    }
    if (row.channel !== 'WHATSAPP' || !row.providerId || !providerId(row.providerId)) return {state:'UNCERTAIN'};
    const publicId = process.env.UNIFONIC_WHATSAPP_PUBLIC_ID?.trim(), secret = process.env.UNIFONIC_WHATSAPP_SECRET?.trim();
    if (!publicId || !secret || process.env.UNIFONIC_WHATSAPP_APPLICATION_ID?.trim() !== row.providerScope) return {state:'PENDING'};
    const url = new URL('https://apis.unifonic.com/v1/messages/status');url.searchParams.set('messageIds',row.providerId);
    const response = await fetch(url,{method:'GET',redirect:'error',headers:{PublicId:publicId,Secret:secret,Accept:'application/json'},signal:AbortSignal.timeout(4000)});
    const data = await this.json(response);
    if (!Array.isArray(data) || data.length !== 1) return {state:'UNCERTAIN'};
    const receipt = data[0];
    if (receipt?.messageId !== row.providerId || receipt.channel !== 'whatsapp' || receipt.senderApplicationId !== row.providerScope
      || receipt.referenceId !== 'hydroland-notice/'+row.id || typeof receipt.contact !== 'string'
      || privateDigest('phone',receipt.contact) !== row.recipientHash) return {state:'UNCERTAIN'};
    if (receipt.status === 'DELIVERED' || receipt.status === 'READ') return {state:'DELIVERED'};
    if (receipt.status === 'REJECTED') return {state:'REJECTED'};
    return ['QUEUED','SENT','SENT_SUCCESSFULLY_TO_PROVIDER'].includes(receipt.status) ? {state:'PENDING'} : {state:'UNCERTAIN'};
  }

  private async expo(endpoint:'send'|'getReceipts',body:unknown) {
    const auth = process.env.EXPO_ACCESS_TOKEN?.trim();
    if (!auth) throw Error('Push provider unavailable.');
    const response = await fetch('https://exp.host/--/api/v2/push/'+endpoint,{method:'POST',redirect:'error',headers:{Authorization:'Bearer '+auth,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(4000)});
    return this.json(response);
  }
  private async json(response:Response): Promise<any> {
    if (!response.ok) {await response.body?.cancel();throw Error('Provider response unavailable.');}
    const reader=response.body?.getReader();if(!reader)throw Error('Provider response missing.');
    const chunks:Uint8Array[]=[];let size=0;
    while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>32768){await reader.cancel();throw Error('Provider response too large.');}chunks.push(part.value);}
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }
}
