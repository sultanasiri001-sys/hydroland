import {useCallback,useEffect,useRef,useState} from 'react';
import {AppState,Pressable,SafeAreaView,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {router,useFocusEffect,useLocalSearchParams} from 'expo-router';
import {ApiError} from '../src/api';
import {getSessionScope,isSessionScopeCurrent,sessionGeneration,SessionChangedError,subscribeSession} from '../src/session';
import {loadTripPackage,freshnessLabel,packageSyncState,type OfflineTripPackage} from '../src/offline-trip-package';
import {getOfflinePackageStatus,downloadOfflinePackage,downloadOfflinePayload,verifyStoredOfflinePayload,verifyStoredOfflinePackage,readOfflineBriefing,clearLocalOfflineTrip,type OfflinePackageStatus,type OfflineMediaManifestEntry} from '../src/trip-intelligence';
import {offlineLeaseState} from '../src/offline-access';
import {OfflineAccessError} from '../src/offline-errors';
import {refreshOfflineDrafts,loadOfflineDrafts,queueOfflineDraft,syncOfflineDrafts,resolveOfflineDraftConflict,type OfflineDraftRecord} from '../src/offline-sync';

type Briefing=Awaited<ReturnType<typeof readOfflineBriefing>>;
type State={tripId:string;generation:number;loaded:boolean;pkg:OfflineTripPackage|null;status:OfflinePackageStatus|null;briefing:Briefing;drafts:OfflineDraftRecord[];mediaReady:string[];offline:boolean;denied:boolean;notice:string};
const empty=(tripId:string,generation:number):State=>({tripId,generation,loaded:false,pkg:null,status:null,briefing:null,drafts:[],mediaReady:[],offline:false,denied:false,notice:''});
const notes=(value:unknown)=>value&&typeof value==='object'&&!Array.isArray(value)&&typeof (value as {notes?:unknown}).notes==='string'?(value as {notes:string}).notes:'';
const editable=(value:unknown)=>value==null||(typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(key=>key==='notes')&&((value as {notes?:unknown}).notes===undefined||typeof (value as {notes?:unknown}).notes==='string'));
function message(error:unknown){
 if(error instanceof OfflineAccessError){if(error.code==='OFFLINE_ENCRYPTION_UNAVAILABLE')return'التخزين المشفر غير متاح على هذا الجهاز؛ لم تُفتح أو تُحفظ بيانات خاصة.';if(error.code==='OFFLINE_CACHE_CORRUPT')return'تعذر توثيق النسخة المشفرة. أعد تنزيل الحزمة بعد الاتصال.';if(error.code==='PENDING_SYNC')return'توجد مسودة بانتظار المزامنة؛ أعد المحاولة أو عالج تعارضها أولًا.';return'يلزم اتصال للتحقق من صلاحية المصدر قبل فتح البيانات أو تعديلها.'}
 if(error instanceof ApiError){if(error.status===401)return'انتهت الجلسة. سجّل الدخول مجددًا.';if(error.status===403)return'لم يعد الوصول إلى بيانات هذه الرحلة مسموحًا.';if(error.status===409)return'تغيّر المصدر. أعد التحقق قبل متابعة التعديل.'}
 return'تعذر إكمال العملية. بقيت المسودة المعلقة محفوظة مشفرة إن سبق حفظها؛ يمكنك إعادة المحاولة.';
}
const Button=({title,onPress,disabled=false,testID}:{title:string;onPress:()=>void;disabled?:boolean;testID?:string})=><Pressable testID={testID} accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={[s.button,disabled&&s.disabled]}><Text style={s.buttonText}>{title}</Text></Pressable>;
export default function TripDay(){
 const params=useLocalSearchParams<{tripId?:string|string[]}>(),tripId=typeof params.tripId==='string'?params.tripId:'';
 const [epoch,setEpoch]=useState(sessionGeneration),[revision,setRevision]=useState(0),[state,setState]=useState<State>(()=>empty(tripId,epoch)),[busy,setBusy]=useState(false),[foreground,setForeground]=useState(true),[tick,setTick]=useState(0);
 const [form,setForm]=useState<{tripId:string;generation:number;id:string;title:string;notes:string}|null>(null);
 const serial=useRef(0),mounted=useRef(true),busyRef=useRef(false),scopeRef=useRef({tripId,generation:epoch});scopeRef.current={tripId,generation:epoch};
 const clear=useCallback(()=>{serial.current++;busyRef.current=false;setBusy(false);setForm(null);setState(empty(scopeRef.current.tripId,sessionGeneration()))},[]);
 const retry=useCallback(()=>setRevision(value=>value+1),[]);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;serial.current++}},[]);
 useEffect(()=>subscribeSession(()=>{clear();setEpoch(sessionGeneration())}),[clear]);
 useFocusEffect(useCallback(()=>{retry();return()=>{clear()}},[retry,clear]));
 useEffect(()=>{const listener=AppState.addEventListener('change',value=>{clear();setForeground(value==='active');if(value==='active')retry()});return()=>listener.remove()},[clear,retry]);
 useEffect(()=>{const timer=setInterval(()=>setTick(value=>value+1),1000);return()=>clearInterval(timer)},[]);
 useEffect(()=>{
  const request=++serial.current,generation=sessionGeneration();setState(empty(tripId,generation));setForm(null);busyRef.current=false;setBusy(false);
  const current=()=>mounted.current&&serial.current===request&&generation===sessionGeneration()&&scopeRef.current.tripId===tripId;
  const login=()=>{if(current())router.replace({pathname:'/login',params:{returnTo:tripId?`/trip-day?tripId=${encodeURIComponent(tripId)}`:'/trip-day'}})};
  if(!foreground)return;
  (async()=>{try{
   const scope=await getSessionScope();if(!current())return;if(!scope){login();return}const next=empty(tripId,generation);
   if(tripId){
    // Renew authority first. A stored manifest cannot renew its own permission.
    try{next.status=await getOfflinePackageStatus(tripId)}catch(error){if(!current()||!isSessionScopeCurrent(scope))return;if(error instanceof ApiError&&(error.status===401||error.status===403)){next.denied=true;next.notice=message(error);if(error.status===401){login();return}}else{next.offline=true;next.notice=message(error)}}
    if(!current()||!isSessionScopeCurrent(scope))return;
    if(!next.denied&&offlineLeaseState('PACKAGE',tripId)){
     try{if(await verifyStoredOfflinePackage(tripId,scope)){next.pkg=await loadTripPackage(tripId,scope);next.briefing=await readOfflineBriefing(tripId);const entries=(next.briefing?.manifest as {files?:OfflineMediaManifestEntry[]})?.files??[];for(const entry of entries.filter(item=>item.key.startsWith('media:')))if(await verifyStoredOfflinePayload(tripId,entry).catch(()=>false))next.mediaReady.push(entry.key)}}catch(error){next.notice=message(error)}
    }
    if(!current()||!isSessionScopeCurrent(scope))return;
    if(!next.denied){try{next.drafts=await refreshOfflineDrafts(tripId)}catch(error){if(!current()||!isSessionScopeCurrent(scope))return;if(!(error instanceof ApiError&&error.status===403)){try{next.drafts=await loadOfflineDrafts(tripId)}catch{next.drafts=[]}}}}
   }
   if(current()&&isSessionScopeCurrent(scope)){next.loaded=true;setState(next)}
  }catch(error){if(!current())return;if(error instanceof SessionChangedError||error instanceof ApiError&&error.status===401){login();return}setState({...empty(tripId,generation),loaded:true,notice:message(error)})}})();
  return()=>{if(serial.current===request)serial.current++};
 },[tripId,epoch,revision,foreground]);
 const same=foreground&&state.tripId===tripId&&state.generation===epoch&&epoch===sessionGeneration(),view=same?state:empty(tripId,sessionGeneration());
 const packageAllowed=same&&offlineLeaseState('PACKAGE',tripId),drafts=view.drafts.filter(record=>offlineLeaseState('DRAFT',record.source.id)),pkg=packageAllowed?view.pkg:null,briefing=packageAllowed?view.briefing:null;
 // Expiry hides data during render and then releases the displayed plaintext.
 useEffect(()=>{if(!same)return;if(!offlineLeaseState('PACKAGE',tripId)&&state.briefing)setState(value=>({...value,briefing:null,pkg:null,mediaReady:[]}));if(state.drafts.some(record=>!offlineLeaseState('DRAFT',record.source.id)))setState(value=>({...value,drafts:value.drafts.filter(record=>offlineLeaseState('DRAFT',record.source.id))}));if(form&&!offlineLeaseState('DRAFT',form.id))setForm(null)},[tick,same,tripId,state.briefing,form]);
 const currentForm=form&&form.tripId===tripId&&form.generation===epoch&&offlineLeaseState('DRAFT',form.id)?form:null,selected=drafts.find(record=>record.source.id===currentForm?.id);
 const run=async(work:()=>Promise<unknown>,success:string)=>{if(busyRef.current||!same)return;const request=serial.current,generation=epoch;busyRef.current=true;setBusy(true);const current=()=>mounted.current&&serial.current===request&&generation===sessionGeneration()&&scopeRef.current.tripId===tripId;try{await work();if(current()){setForm(null);setState(value=>({...value,notice:success}));retry()}}catch(error){if(current())setState(value=>({...value,notice:message(error)}))}finally{if(current()){busyRef.current=false;setBusy(false)}}};
 const choose=(record:OfflineDraftRecord)=>setForm({tripId,generation:epoch,id:record.source.id,title:record.pending?.patch.title??record.source.title??'',notes:record.pending?.patch.summary.notes??notes(record.source.summary)});
 const media=((briefing?.manifest as {files?:OfflineMediaManifestEntry[]})?.files??[]).filter(entry=>entry.key.startsWith('media:'));
 const sync=packageSyncState(pkg,view.status,!view.offline,!!briefing),labels={MATCHED:'الحزمة المحلية مطابقة للنسخة المعتمدة في الخادم.',UPDATE_REQUIRED:'الحزمة المحلية تحتاج تحديثًا قبل الاعتماد عليها.',NO_LOCAL_PACKAGE:'لا توجد حزمة رحلة محلية متاحة على الجهاز.',SERVER_NOT_READY:'الحزمة المعتمدة في الخادم غير جاهزة بعد.',SERVER_UNAVAILABLE:'تعذر التحقق من الخادم — لا يمكن تأكيد حداثة الحزمة المحلية.'};
 return <SafeAreaView style={s.page}><ScrollView contentContainerStyle={s.content}><Text style={s.title}>وضع يوم الرحلة</Text>
  <View style={s.card}><Text style={s.heading}>Offline Readiness</Text><Text style={s.text}>{!view.loaded?'جاري التحقق من صلاحية الوصول…':view.denied?'لم يعد الوصول إلى حزمة هذه الرحلة مسموحًا.':!tripId?'اختر رحلة لفتح حزمة يوم الرحلة.':!packageAllowed?'يلزم اتصال للتحقق من المصدر قبل فتح الحزمة الخاصة.':pkg&&freshnessLabel(pkg)==='CURRENT_CACHE'?'نسخة مشفرة متاحة ضمن صلاحية القراءة الحالية.':'لا توجد حزمة رحلة محفوظة على هذا الجهاز.'}</Text><Text style={s.text}>{labels[sync]}</Text>{pkg?<Text style={s.meta}>إصدار الإحاطة: {pkg.briefingVersion} · انتهاء صلاحية القراءة: {new Date(pkg.staleAfter!).toLocaleTimeString('ar-SA')}</Text>:null}<Text style={s.meta}>صلاحية القراءة لا تتجاوز 15 دقيقة من تحقق الخادم. إعادة تشغيل التطبيق أو رجوع ساعة الجهاز يتطلبان اتصالًا جديدًا.</Text></View>
  {!!view.notice&&<Text testID="offline-notice" accessibilityRole="alert" style={s.notice}>{view.notice}</Text>}
  <Button title="إعادة التحقق من الحزمة" onPress={retry} disabled={busy}/>
  <Button testID="offline-package-download" title="تنزيل الحزمة مشفرة" disabled={busy||!tripId||view.denied} onPress={()=>void run(()=>downloadOfflinePackage(tripId),'حُفظت الحزمة مشفرة.')}/>
  <Button testID="offline-local-delete" title="حذف جميع بيانات الرحلة من هذا الجهاز" disabled={!tripId} onPress={()=>{clear();void clearLocalOfflineTrip(tripId).then(()=>{if(mounted.current&&scopeRef.current.tripId===tripId&&epoch===sessionGeneration())setState({...empty(tripId,epoch),loaded:true,notice:'حُذفت بيانات الرحلة المحلية. أعد التحقق عند الحاجة.'})}).catch(error=>{if(mounted.current)setState(value=>({...value,notice:message(error)}))})}}/>
  {briefing?<View style={s.card}><Text style={s.heading}>{briefing.briefing?.title??'الإحاطة المعتمدة'}</Text>{notes(briefing.briefing?.summary)?<Text style={s.text}>{notes(briefing.briefing?.summary)}</Text>:<Text style={s.meta}>تتوفر تفاصيل الإحاطة المنظمة في شاشة التشغيل المعتمدة.</Text>}{media.map(entry=><View key={entry.key}><Text style={s.text}>{entry.mediaType??'ملف'} · {view.mediaReady.includes(entry.key)?'محفوظ مشفرًا':'غير محفوظ'}</Text><Button title="تنزيل الملف الخاص مشفرًا" disabled={busy||entry.classification==='ONLINE_ONLY'||!['PUBLIC_CACHE','OPERATIONAL_OFFLINE','SENSITIVE_ENCRYPTED'].includes(entry.classification??'')} onPress={()=>void run(()=>downloadOfflinePayload(tripId,entry),'حُفظ الملف مشفرًا.')}/></View>)}</View>:null}
  <View style={s.card}><Text style={s.heading}>مسودات الإحاطة</Text><Text style={s.meta}>يمكن تعديل عنوان وملاحظات مسودة تملكها فقط. الحفظ المحلي لا يعني قبول الخادم؛ النشر والاعتماد وقرارات السلامة تتطلب الاتصال ومسارها المعتمد.</Text>{!drafts.length?<Text style={s.text}>لا توجد مسودة مأذونة ومتاحة حاليًا. اتصل لتحديث صلاحيتها.</Text>:drafts.map(record=><View key={record.source.id}><Button title={`${record.source.title??'مسودة بلا عنوان'} — ${record.lastResult?.status==='CONFLICT'?'تعارض يحتاج مراجعة':record.pending?'بانتظار المزامنة':record.lastResult?.status==='APPLIED'?'قبلها الخادم':'مسودة'}`} disabled={busy} onPress={()=>choose(record)}/>{record.lastResult?.status==='NEEDS_ONLINE_VERIFICATION'?<Text style={s.notice}>يلزم التحقق عبر الاتصال؛ لم تُستبدل نسخة الخادم بهذه المحاولة.</Text>:null}</View>)}
   <Button testID="offline-draft-sync" title="مزامنة المسودات المعلقة / إعادة المحاولة" disabled={busy||!drafts.some(record=>record.pending)} onPress={()=>void run(()=>syncOfflineDrafts(tripId,drafts.filter(record=>record.pending).map(record=>record.source.id)),'اكتملت محاولة المزامنة.')}/>
  </View>
  {selected&&currentForm?<View style={s.card}><Text style={s.heading}>تحرير المسودة</Text>{!editable(selected.source.summary)?<Text style={s.notice}>هذه المسودة تحتوي تفاصيل منظمة. استخدم المحرر المتصل للحفاظ عليها.</Text>:<><TextInput testID="offline-draft-title" accessibilityLabel="عنوان المسودة" style={s.input} value={currentForm.title} maxLength={200} editable={!busy&&(!selected.pending||selected.lastResult?.status==='CONFLICT')} onChangeText={title=>setForm(value=>value?{...value,title}:null)}/><TextInput testID="offline-draft-notes" accessibilityLabel="ملاحظات المسودة" style={[s.input,s.multiline]} multiline value={currentForm.notes} maxLength={4000} editable={!busy&&(!selected.pending||selected.lastResult?.status==='CONFLICT')} onChangeText={value=>setForm(form=>form?{...form,notes:value}:null)}/><Button testID="offline-draft-save" title="حفظ مسودة مشفرة على الجهاز" disabled={busy||!!selected.pending||!currentForm.title.trim()} onPress={()=>void run(()=>queueOfflineDraft(tripId,currentForm.id,currentForm.title,currentForm.notes),'حُفظ التعديل محليًا؛ ينتظر قبول الخادم.')}/></>}
   {selected.lastResult?.status==='CONFLICT'?<><Text style={s.notice}>تغيّرت نسخة الخادم. راجعها ثم اختر الاحتفاظ بها أو احفظ دمجك كطلب جديد.</Text><Text style={s.text}>عنوان الخادم: {selected.source.title}</Text><Text style={s.text}>ملاحظات الخادم: {notes(selected.source.summary)}</Text><Button title="اعتماد نسخة الخادم وإلغاء التعديل المحلي" disabled={busy} onPress={()=>void run(()=>resolveOfflineDraftConflict(tripId,selected.source.id,'SERVER',selected.source.revision),'اعتمدت نسخة الخادم.')}/><Button title="حفظ الدمج بعد مراجعة نسخة الخادم" disabled={busy||!editable(selected.source.summary)||!currentForm.title.trim()} onPress={()=>void run(()=>resolveOfflineDraftConflict(tripId,selected.source.id,'MERGE',selected.source.revision,{title:currentForm.title,notes:currentForm.notes}),'حُفظ طلب الدمج الجديد؛ ينتظر المزامنة.')}/></>:null}
  </View>:null}
  <View style={s.card}><Text style={s.heading}>Safety Readiness</Text><Text style={s.text}>حالة السلامة منفصلة عن جاهزية المحتوى دون اتصال. النسخة المحلية لا تعني أن حالة البحر أو قرار التشغيل Live، ولا تتجاوز قرار السلامة المركزي.</Text></View>
 </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#061826'},content:{padding:24,gap:16,paddingBottom:48},title:{color:'#fff',fontSize:28,fontWeight:'800',textAlign:'right'},card:{backgroundColor:'#0b2534',borderColor:'#17465b',borderWidth:1,borderRadius:20,padding:18,gap:12},heading:{color:'#44d7e8',fontSize:18,fontWeight:'800',textAlign:'right'},text:{color:'#e5f0f5',fontSize:15,lineHeight:25,textAlign:'right'},meta:{color:'#afc9d5',fontSize:13,lineHeight:22,textAlign:'right'},notice:{color:'#ffe0a3',fontSize:15,lineHeight:24,textAlign:'right'},button:{backgroundColor:'#14627b',padding:14,borderRadius:12},buttonText:{color:'#fff',fontSize:15,fontWeight:'700',textAlign:'center'},disabled:{opacity:0.45},input:{backgroundColor:'#071c28',borderColor:'#5b899d',borderWidth:1,borderRadius:10,padding:12,color:'#fff',textAlign:'right',minHeight:48},multiline:{minHeight:120,textAlignVertical:'top'}});
