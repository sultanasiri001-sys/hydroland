(()=>{
  // Authored interface messages only. Account, provider and document values remain opaque.
  const uiLocale=window.HydrolandI18n?.createScope("messages", {
  "حذف رسالتي للطرفين":"Delete my message for everyone","إبلاغ خدمة العملاء عن إساءة":"Report abuse to customer service","رسالة محذوفة":"Deleted message","تأكيد حذف الرسالة للطرفين؟ تحتفظ المنصة بنسخة مقيّدة ٣٠ يومًا لبلاغات الإساءة.":"Delete for everyone? A restricted copy is retained for 30 days for abuse reports.","تأكيد فتح بلاغ عن هذه الرسالة لدى خدمة العملاء؟":"Open a customer service report for this message?","رقم بلاغ خدمة العملاء: {0}":"Customer service case: {0}","تعذر تنفيذ الإجراء. حدّث المحادثة وحاول مجددًا.":"Could not complete the action. Refresh the conversation and try again.",
  "فتح الرسائل": "Open messages",
  "{0}، {1} محادثات غير مقروءة": "{0}, {1} unread conversations",
  "عضو HYDROLAND": "HYDROLAND member",
  "، ": ", ",
  "محادثة HYDROLAND": "HYDROLAND conversation",
  "رسالة صوتية": "Voice message",
  "لا توجد رسائل بعد": "No messages yet",
  "سجّل الدخول لفتح الرسائل": "Sign in to open messages",
  "MESSAGES · الرسائل": "MESSAGES",
  "المحادثات": "Conversations",
  "إغلاق": "Close",
  "محادثة جديدة": "New conversation",
  "معرّف حساب الطرف الآخر": "Other participant's account ID",
  "عنوان المحادثة": "Conversation title",
  "مثال: رحلة جزيرة سمر": "Example: Samar Island trip",
  "إنشاء": "Create",
  "اختر محادثة": "Choose a conversation",
  "اختر محادثة لعرض الرسائل.": "Choose a conversation to view messages.",
  "نص الرسالة": "Message text",
  "اكتب رسالتك...": "Write your message...",
  "إرسال": "Send",
  "رابط الملف الصوتي": "Audio file URL",
  "https://... ملف صوتي": "https://... audio file",
  "مدة الصوت": "Audio duration",
  "ثوانٍ": "Seconds",
  "إرسال الصوت": "Send audio",
  "يقبل رابط HTTPS لملف صوتي. التسجيل والرفع المباشر يحتاج مزود التخزين.": "Accepts an HTTPS link to an audio file. Direct recording and upload require a storage provider.",
  "لا توجد محادثات بعد.": "No conversations yet.",
  "تحميل الرسائل الأقدم": "Load older messages",
  "لا توجد رسائل بعد.": "No messages yet.",
  "ثانية": "seconds",
  "جارٍ تحميل الرسائل الأقدم...": "Loading older messages...",
  "تعذر تحميل الرسائل الأقدم؛ حاول مجددًا": "Could not load older messages. Try again",
  "تعذر تحميل الرسائل": "Could not load messages",
  "جارٍ تحميل المحادثات...": "Loading conversations...",
  "جارٍ تحميل الرسائل...": "Loading messages...",
  "تعذر فتح المحادثة": "Could not open the conversation",
  "معرّف الطرف الآخر مطلوب": "The other participant's account ID is required",
  "جارٍ إنشاء المحادثة...": "Creating conversation...",
  "تعذر إنشاء المحادثة": "Could not create the conversation",
  "اختر محادثة أولًا": "Choose a conversation first",
  "جارٍ الإرسال...": "Sending...",
  "تعذر إرسال الرسالة": "Could not send the message",
  "اكتب رسالة أولًا": "Write a message first",
  "الرسائل": "Messages",
  "،": ","
}) || {messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),attribute:(name,text,values=[])=>name+'=\"'+String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))+'\"',message:(text,values=[])=>String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),setMessage:(node,value)=>(node.textContent=value??''),t:value=>value,label:(text,values=[])=>String(text??'').replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  const auth=()=>window.HydrolandAuth;
  const toast=message=>{const t=document.getElementById('toast');if(!t)return;uiLocale.setMessage(t, message);t.classList.add('visible');setTimeout(()=>t.classList.remove('visible'),2200)};
  const state={conversations:[],current:null,selectedId:null,dialog:null,navigation:0,session:0,historyLoading:false,sending:false};
  const request=async(path,options={})=>{const session=state.session,client=auth()?.authorizedFetch;if(!client)throw new Error('AUTH_REQUIRED');const response=await client(path,options),body=await response.json().catch(()=>null);if(session!==state.session||!auth()?.isAuthenticated?.())throw new Error('AUTH_CHANGED');if(!response.ok)throw new Error(body?.message||`HTTP_${response.status}`);return body};
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const me=()=>window.HydrolandProfileData?.profile?.id||null;
  let unreadConversationCount=0;
  const updateMessageIndicators=count=>{unreadConversationCount=Math.max(0,Number(count)||0);document.querySelectorAll('#top-messages,.mobile-nav button[data-hl-messages-bound],[data-diver-messages],[data-portal-messages]').forEach(button=>{button.dataset.hlIndicatorBaseLabel='فتح الرسائل';if(unreadConversationCount){button.dataset.unread=unreadConversationCount>99?'99+':String(unreadConversationCount);uiLocale.setAttribute(button, "aria-label", ...["{0}، {1} محادثات غير مقروءة", [uiLocale.message(button.dataset.hlIndicatorBaseLabel), unreadConversationCount]])}else{delete button.dataset.unread;uiLocale.setAttribute(button,'aria-label',button.dataset.hlIndicatorBaseLabel)}})};
  const countUnreadConversations=conversations=>{const accountId=me();if(!accountId||!Array.isArray(conversations))return 0;return conversations.filter(conversation=>{const mine=(conversation.participants||[]).find(participant=>participant.accountId===accountId),latest=conversation.latestMessage;if(!mine||!latest||latest.senderAccountId===accountId)return false;const latestAt=Date.parse(latest.createdAt),lastReadAt=mine.lastReadAt?Date.parse(mine.lastReadAt):Number.NEGATIVE_INFINITY;return Number.isFinite(latestAt)&&latestAt>lastReadAt}).length};
  const participantName=p=>`${p?.firstName||''} ${p?.lastName||''}`.trim()||p?.email||uiLocale.t('عضو HYDROLAND');
  const conversationName=c=>c.title||c.participants?.filter(p=>p.accountId!==me()).map(participantName).join('، ')||uiLocale.message('محادثة HYDROLAND');
  const latestText=c=>c.latestMessage?.withdrawnAt?uiLocale.message('رسالة محذوفة'):c.latestMessage?.kind==='VOICE'?uiLocale.message('رسالة صوتية'):c.latestMessage?.body||uiLocale.message('لا توجد رسائل بعد');
  const forceLogin=()=>{sessionStorage.removeItem('hl-guest-mode');auth()?.syncAuthUi?.();toast(uiLocale.message('سجّل الدخول لفتح الرسائل'))};
  const ensureDialog=()=>{
    if(state.dialog)return state.dialog;
    const dialog=document.createElement('dialog');dialog.id='hl-messages-dialog';dialog.className='hl-messages-dialog';uiLocale.setHTML(dialog, uiLocale.html`<div class="hl-messages-shell"><aside class="hl-conversation-list"><header><div><small>MESSAGES · الرسائل</small><h2>المحادثات</h2></div><button class="hl-messages-close" type="button" data-messages-close aria-label="إغلاق">×</button></header><button class="hl-new-conversation" type="button" data-new-conversation>محادثة جديدة</button><form class="hl-new-conversation-form" data-new-conversation-form hidden><label>معرّف حساب الطرف الآخر<input name="participantId" required maxlength="80" autocomplete="off"></label><label>عنوان المحادثة<input name="title" maxlength="120" placeholder="مثال: رحلة جزيرة سمر"></label><button type="submit">إنشاء</button></form><div class="hl-conversation-items" data-conversation-items></div></aside><section class="hl-message-pane"><header><div><small>HYDROLAND CHAT</small><h3 data-message-title>اختر محادثة</h3></div><span class="hl-message-meta" data-message-participants></span></header><div class="hl-message-stream" data-message-stream><p class="hl-message-empty">اختر محادثة لعرض الرسائل.</p></div><form class="hl-message-compose" data-message-form><div class="hl-message-compose-row"><textarea name="body" maxlength="4000" placeholder="اكتب رسالتك..." aria-label="نص الرسالة"></textarea><button class="primary" type="submit">إرسال</button></div><details><summary>رسالة صوتية</summary><div class="hl-voice-compose"><input name="mediaUrl" type="url" placeholder="https://... ملف صوتي" aria-label="رابط الملف الصوتي"><input name="durationSec" type="number" min="1" max="600" placeholder="ثوانٍ" aria-label="مدة الصوت"><button type="button" data-send-voice>إرسال الصوت</button></div><small>يقبل رابط HTTPS لملف صوتي. التسجيل والرفع المباشر يحتاج مزود التخزين.</small></details><p class="hl-message-status" data-message-status role="status"></p></form></section></div>`);
    document.body.appendChild(dialog);state.dialog=dialog;
    dialog.querySelector('[data-messages-close]').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('close',()=>resetConversation());
    dialog.querySelector('[data-new-conversation]').addEventListener('click',()=>{const form=dialog.querySelector('[data-new-conversation-form]');form.hidden=!form.hidden});
    dialog.querySelector('[data-new-conversation-form]').addEventListener('submit',createConversation);
    dialog.querySelector('[data-message-form]').addEventListener('submit',sendText);
    dialog.querySelector('[data-send-voice]').addEventListener('click',sendVoice);
    return dialog;
  };
  const status=text=>{const el=ensureDialog().querySelector('[data-message-status]');if(el)uiLocale.setMessage(el, text||'')};
  const renderList=()=>{const host=ensureDialog().querySelector('[data-conversation-items]');uiLocale.setHTML(host, '');if(!state.conversations.length){uiLocale.setHTML(host, uiLocale.html`<p class="hl-message-empty">لا توجد محادثات بعد.</p>`);return}state.conversations.forEach(c=>{const b=document.createElement('button');b.type='button';b.className='hl-conversation-item'+(state.current?.id===c.id?' active':'');b.dataset.conversationId=c.id;uiLocale.setHTML(b, uiLocale.html`<strong>${uiLocale.messageHTML(conversationName(c))}</strong><small>${uiLocale.messageHTML(latestText(c))}</small>`);b.addEventListener('click',()=>openConversation(c.id));host.appendChild(b)})};
  const resetConversation=(clearDraft=true)=>{state.navigation++;state.current=null;state.selectedId=null;state.historyLoading=false;state.sending=false;if(!state.dialog)return;uiLocale.setText(state.dialog.querySelector('[data-message-title]'), ...['اختر محادثة']);state.dialog.querySelector('[data-message-participants]').textContent='';uiLocale.setHTML(state.dialog.querySelector('[data-message-stream]'), uiLocale.html`<p class="hl-message-empty">اختر محادثة لعرض الرسائل.</p>`);if(clearDraft)state.dialog.querySelector('[data-message-form]').reset();status('')};
  const active=revision=>revision===state.navigation&&state.dialog?.open&&auth()?.isAuthenticated?.();
  // Anchor the visible message, not a guessed scroll-height delta. Rebuilding the
  // stream may clamp scrollTop, remove the history button or change row heights.
  const readMessageAnchor=stream=>{
    const viewport=stream.getBoundingClientRect();
    const element=[...stream.querySelectorAll('[data-message-id]')].find(message=>{const rect=message.getBoundingClientRect();return rect.bottom>viewport.top&&rect.top<viewport.bottom});
    return element?{id:element.dataset.messageId,top:element.getBoundingClientRect().top}:null;
  };
  const restoreMessageAnchor=(stream,anchor,oldTop,oldHeight)=>{
    const element=anchor&&[...stream.querySelectorAll('[data-message-id]')].find(message=>message.dataset.messageId===anchor.id);
    stream.scrollTop=element?stream.scrollTop+element.getBoundingClientRect().top-anchor.top:oldTop+stream.scrollHeight-oldHeight;
  };
  const renderConversation=(conversation,preserveScroll=false)=>{
    const dialog=ensureDialog(),stream=dialog.querySelector('[data-message-stream]'),oldHeight=stream.scrollHeight,oldTop=stream.scrollTop,anchor=preserveScroll?readMessageAnchor(stream):null;
    uiLocale.setMessage(dialog.querySelector('[data-message-title]'),conversationName(conversation));dialog.querySelector('[data-message-participants]').textContent=(conversation.participants||[]).map(participantName).join(' · ');uiLocale.setHTML(stream, '');
    if(conversation.hasMore&&conversation.olderCursor){const button=document.createElement('button');button.type='button';button.dataset.loadOlderMessages='';uiLocale.setText(button, ...['تحميل الرسائل الأقدم']);button.disabled=state.historyLoading;button.addEventListener('click',loadOlder);stream.appendChild(button)}
    const messages=conversation.messages||[];
    if(!messages.length){uiLocale.setHTML(stream, uiLocale.html`<p class="hl-message-empty">لا توجد رسائل بعد.</p>`);return}
    messages.forEach(message=>{const article=document.createElement('article');article.dataset.messageId=message.id;article.className='hl-message'+(message.senderAccountId===me()?' mine':'');const sender=participantName({firstName:message.senderFirstName,lastName:message.senderLastName,email:message.senderEmail});const time=new Date(message.createdAt).toLocaleString('ar-SA');if(message.withdrawnAt){uiLocale.setMessage(article,uiLocale.message('رسالة محذوفة'))}else if(message.kind==='VOICE'){uiLocale.setHTML(article, uiLocale.html`<small>${esc(sender)} · ${esc(time)}</small><audio controls preload="none" src="${esc(message.mediaUrl)}"></audio><small>${Number(message.durationSec)||0} ثانية</small>`)}else{uiLocale.setHTML(article, uiLocale.html`<small>${esc(sender)} · ${esc(time)}</small><p>${esc(message.body)}</p>`)}if(conversation.participants?.length===2)addMessageActions(article,conversation.id,message);
      stream.appendChild(article)});
    if(preserveScroll)restoreMessageAnchor(stream,anchor,oldTop,oldHeight);else stream.scrollTop=stream.scrollHeight;
  };
  function addMessageActions(article,conversationId,message) {
    const revision=state.navigation;
    for(const action of ['withdraw','report']){
      const withdraw=action==='withdraw';
      if(withdraw&&(message.withdrawnAt||message.senderAccountId!==me()))continue;
      const button=document.createElement('button');
      button.type='button';
      uiLocale.setMessage(button,uiLocale.message(withdraw?'حذف رسالتي للطرفين':'إبلاغ خدمة العملاء عن إساءة'));
      button.addEventListener('click',async()=>{
        if(!active(revision)||!window.confirm(uiLocale.message(withdraw?'تأكيد حذف الرسالة للطرفين؟ تحتفظ المنصة بنسخة مقيّدة ٣٠ يومًا لبلاغات الإساءة.':'تأكيد فتح بلاغ عن هذه الرسالة لدى خدمة العملاء؟')))return;
        button.disabled=true;
        try{
          const result=await request('/messages/conversations/'+encodeURIComponent(conversationId)+'/messages/'+encodeURIComponent(message.id)+'/'+action,{method:'POST',body:'{}'});
          if(!active(revision))return;
          if(withdraw)await openConversation(conversationId);
          else status(uiLocale.message('رقم بلاغ خدمة العملاء: {0}',[result.caseId]));
        }catch{if(active(revision))status(uiLocale.message('تعذر تنفيذ الإجراء. حدّث المحادثة وحاول مجددًا.'))}
        finally{button.disabled=false}
      });
      article.appendChild(button);
    }
  }
  async function loadOlder(){
    const conversation=state.current,revision=state.navigation;
    if(!conversation?.hasMore||!conversation.olderCursor||state.historyLoading||!active(revision))return;
    state.historyLoading=true;const button=state.dialog.querySelector('[data-load-older-messages]');if(button)button.disabled=true;status(uiLocale.message('جارٍ تحميل الرسائل الأقدم...'));
    try{
      const page=await request('/messages/conversations/'+encodeURIComponent(conversation.id)+'/messages?before='+encodeURIComponent(conversation.olderCursor));
      if(!active(revision))return;
      const seen=new Set(conversation.messages.map(message=>message.id));
      conversation.messages=[...page.messages.filter(message=>!seen.has(message.id)),...conversation.messages];
      conversation.hasMore=page.hasMore;conversation.olderCursor=page.olderCursor;
      renderConversation(conversation,true);status('');
    }catch(error){if(active(revision))status((error.message || uiLocale.message('تعذر تحميل الرسائل الأقدم؛ حاول مجددًا')))}
    finally{if(active(revision)){state.historyLoading=false;const current=state.dialog.querySelector('[data-load-older-messages]');if(current)current.disabled=false}}
  }
  const load=async()=>{if(!auth()?.isAuthenticated?.()){state.conversations=[];state.current=null;updateMessageIndicators(0);return[]}try{state.conversations=await request('/messages/conversations');updateMessageIndicators(countUnreadConversations(state.conversations));renderList();return state.conversations}catch(error){if(error.message!=='AUTH_CHANGED')status((error.message || uiLocale.message('تعذر تحميل الرسائل')));return[]}};
  const refreshMessageIndicators=async()=>{if(!auth()?.isAuthenticated?.()){state.conversations=[];state.current=null;updateMessageIndicators(0);return[]}try{state.conversations=await request('/messages/conversations');updateMessageIndicators(countUnreadConversations(state.conversations));if(state.dialog?.open){
      renderList();
      const conversation=state.current,revision=state.navigation;
      if(conversation&&!state.historyLoading){
        const fresh=await request('/messages/conversations/'+encodeURIComponent(conversation.id));
        if(active(revision)&&state.current===conversation){state.current=fresh;renderConversation(fresh,true)}
      }
    }return state.conversations}catch{return state.conversations}};
  const open=async()=>{if(!auth()?.isAuthenticated?.()){forceLogin();return}const dialog=ensureDialog();dialog.showModal();const revision=state.navigation;status(uiLocale.message('جارٍ تحميل المحادثات...'));await load();if(active(revision))status('')};
  const openConversation=async id=>{
    const sameConversation=state.selectedId===id;resetConversation(!sameConversation);state.selectedId=id;const revision=state.navigation;
    try{status(uiLocale.message('جارٍ تحميل الرسائل...'));const conversation=await request('/messages/conversations/'+encodeURIComponent(id));if(!active(revision))return;state.current=conversation;renderList();renderConversation(conversation);await request('/messages/conversations/'+encodeURIComponent(id)+'/read',{method:'POST',body:'{}'});if(!active(revision))return;await refreshMessageIndicators();if(active(revision))status('')}
    catch(error){if(active(revision))status((error.message || uiLocale.message('تعذر فتح المحادثة')))}
  };
  async function createConversation(event){event.preventDefault();const form=event.currentTarget,data=new FormData(form),participantId=String(data.get('participantId')||'').trim(),title=String(data.get('title')||'').trim(),revision=state.navigation;if(!participantId){status(uiLocale.message('معرّف الطرف الآخر مطلوب'));return}try{status(uiLocale.message('جارٍ إنشاء المحادثة...'));const conversation=await request('/messages/conversations',{method:'POST',body:JSON.stringify({participantAccountIds:[participantId],title:title||undefined})});if(!active(revision))return;form.reset();form.hidden=true;await load();if(active(revision))await openConversation(conversation.id)}catch(error){if(active(revision))status((error.message || uiLocale.message('تعذر إنشاء المحادثة')))}}
  async function send(payload,fields){
    const conversation=state.current,revision=state.navigation;if(!conversation){status(uiLocale.message('اختر محادثة أولًا'));return}if(state.sending||!active(revision))return;const form=state.dialog.querySelector('[data-message-form]'),submitted=new Map(fields.map(field=>[field,form.elements[field].value]));state.sending=true;
    try{status(uiLocale.message('جارٍ الإرسال...'));await request('/messages/conversations/'+encodeURIComponent(conversation.id)+'/messages',{method:'POST',body:JSON.stringify(payload)});if(!active(revision))return;fields.forEach(field=>{if(form.elements[field].value===submitted.get(field))form.elements[field].value=''});await openConversation(conversation.id);await load()}
    catch(error){if(active(revision))status((error.message || uiLocale.message('تعذر إرسال الرسالة')))}
    finally{if(active(revision))state.sending=false}
  }
  async function sendText(event){event.preventDefault();const body=String(new FormData(event.currentTarget).get('body')||'').trim();if(!body){status(uiLocale.message('اكتب رسالة أولًا'));return}await send({kind:'TEXT',body},['body'])}
  async function sendVoice(){const data=new FormData(ensureDialog().querySelector('[data-message-form]')),mediaUrl=String(data.get('mediaUrl')||'').trim(),durationSec=Number(data.get('durationSec'));await send({kind:'VOICE',mediaUrl,durationSec},['mediaUrl','durationSec'])}
  const connectControls=()=>{const allowed=Boolean(auth()?.isAuthenticated?.()),mobile=[...document.querySelectorAll('.mobile-nav button')].find(button=>button.dataset.hlMessagesBound==='1'||button.dataset.hlAction==='messages'||button.textContent?.includes('الرسائل'));if(mobile){mobile.hidden=!allowed;if(allowed){mobile.disabled=false;mobile.removeAttribute('title');uiLocale.setAttribute(mobile, "aria-label", ...['فتح الرسائل']);mobile.dataset.hlIndicatorBaseLabel='فتح الرسائل';mobile.dataset.hlAction='messages'}else mobile.disabled=true;if(!mobile.dataset.hlMessagesBound){mobile.dataset.hlMessagesBound='1';mobile.addEventListener('click',open)}}const top=document.querySelector('.top-actions');if(top&&!document.getElementById('top-messages')){const button=document.createElement('button');button.id='top-messages';button.type='button';button.className='icon-button hl-top-messages';uiLocale.setAttribute(button, "aria-label", ...['فتح الرسائل']);button.textContent='✉';button.addEventListener('click',open);top.insertBefore(button,document.getElementById('top-notifications')||top.firstChild)}const topMessage=document.getElementById('top-messages');if(topMessage){topMessage.hidden=!allowed;topMessage.dataset.hlIndicatorBaseLabel='فتح الرسائل'}updateMessageIndicators(allowed?unreadConversationCount:0)};
  connectControls();document.addEventListener('hydroland:auth-changed',()=>{state.session++;state.conversations=[];resetConversation();if(state.dialog){const form=state.dialog.querySelector('[data-new-conversation-form]');form.reset();form.hidden=true;renderList()}updateMessageIndicators(0);connectControls();if(!auth()?.isAuthenticated?.()){state.dialog?.close();state.current=null;state.conversations=[];updateMessageIndicators(0)}else void refreshMessageIndicators()});
  document.addEventListener('hydroland:profile-data-ready',()=>{if(auth()?.isAuthenticated?.())void refreshMessageIndicators()});
  const indicatorObserver=new MutationObserver(()=>updateMessageIndicators(unreadConversationCount));indicatorObserver.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void refreshMessageIndicators()});setInterval(()=>{if(document.visibilityState==='visible')void refreshMessageIndicators()},60000);
  window.HydrolandMessages={open,reload:load,openConversation,refreshIndicators:refreshMessageIndicators};
})();
