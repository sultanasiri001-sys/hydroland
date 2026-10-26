import {useCallback,useEffect,useState} from 'react';
import {router,useLocalSearchParams,useFocusEffect} from 'expo-router';
import {AppState,Pressable,SafeAreaView,StyleSheet,Text,View} from 'react-native';
import {freshnessLabel,loadTripPackage,deleteTripPackage,OfflineTripPackage,packageSyncState} from '../src/offline-trip-package';
import {getAccessToken,getSessionScope,sessionGeneration,subscribeSession,isSessionScopeCurrent,SessionChangedError} from '../src/session';
import {getOfflinePackageStatus,verifyStoredOfflinePackage,OfflinePackageStatus} from '../src/trip-intelligence';
import {deleteOfflineContent} from '../src/offline-content-store';
import {ApiError} from '../src/api';
const labels={CURRENT_CACHE:'نسخة محلية ضمن مدة الصلاحية المحددة في الحزمة',STALE_CACHE:'نسخة محلية قديمة — يلزم التحديث',UNKNOWN_CACHE:'لا توجد مدة صلاحية موثوقة — لا تعتمد عليها تشغيليًا'};
type ViewState={tripId:string|undefined;generation:number;pkg:OfflineTripPackage|null;serverStatus:OfflinePackageStatus|null;serverError:boolean;verifiedLocalContent:boolean;loaded:boolean;denied:boolean};
const empty=(tripId:string|undefined,generation:number):ViewState=>({tripId,generation,pkg:null,serverStatus:null,serverError:false,verifiedLocalContent:false,loaded:false,denied:false});
export default function TripDay(){
 const params=useLocalSearchParams<{tripId?:string|string[]}>(),tripId=typeof params.tripId==='string'?params.tripId:undefined;
 const [revision,setRevision]=useState(0),[epoch,setEpoch]=useState(sessionGeneration()),[result,setResult]=useState<ViewState>(()=>empty(tripId,epoch));
 const retry=useCallback(()=>setRevision(value=>value+1),[]);
 useEffect(()=>subscribeSession(()=>{setEpoch(sessionGeneration());setResult(empty(tripId,sessionGeneration()))}),[tripId]);
 useFocusEffect(useCallback(()=>{retry();return()=>{}},[retry]));
 useEffect(()=>{const subscription=AppState.addEventListener('change',state=>{if(state==='active')retry()});return()=>subscription.remove()},[retry]);
 useEffect(()=>{
  let active=true;const generation=sessionGeneration();setResult(empty(tripId,generation));
  const loginRedirect=()=>{if(active)router.replace({pathname:'/login',params:{returnTo:tripId?`/trip-day?tripId=${encodeURIComponent(tripId)}`:'/trip-day'}})};
  (async()=>{
   try{
    const token=await getAccessToken();if(!active||generation!==sessionGeneration())return;if(!token){loginRedirect();return}
    const scope=await getSessionScope();if(!active||generation!==sessionGeneration())return;if(!scope){loginRedirect();return}
    const next=empty(tripId,generation);
    if(tripId){
     next.verifiedLocalContent=await verifyStoredOfflinePackage(tripId,scope);if(!active||!isSessionScopeCurrent(scope))return;
     next.pkg=next.verifiedLocalContent?await loadTripPackage(tripId,scope):null;
     try{const remote=await getOfflinePackageStatus(tripId);if(remote.tripId!==tripId)throw new Error('Trip package mismatch.');next.serverStatus=remote}
     catch(error){
      if(!active||!isSessionScopeCurrent(scope))return;
      if(error instanceof ApiError&&(error.status===401||error.status===403)){
       deleteOfflineContent(tripId,scope);await deleteTripPackage(tripId,scope);next.pkg=null;next.verifiedLocalContent=false;next.denied=true;
       if(error.status===401){loginRedirect();return}
      }else next.serverError=true;
     }
    }
    if(active&&isSessionScopeCurrent(scope)){next.loaded=true;setResult(next)}
   }catch(error){
    if(!active)return;
    if(error instanceof SessionChangedError||generation!==sessionGeneration()){if(!await getAccessToken().catch(()=>null))loginRedirect();return}
    if(error instanceof ApiError&&error.status===401){loginRedirect();return}
    setResult({...empty(tripId,generation),serverError:true,loaded:true});
   }
  })();
  return()=>{active=false};
 },[tripId,epoch,revision]);
 // Effects run after render: never display an old trip/session even for one frame.
 const view=result.tripId===tripId&&result.generation===epoch&&epoch===sessionGeneration()?result:empty(tripId,sessionGeneration());
 const{pkg,serverStatus,serverError,verifiedLocalContent,loaded,denied}=view;
 const freshness=pkg?freshnessLabel(pkg):null,sync=packageSyncState(pkg,serverStatus,!serverError,verifiedLocalContent);
 const syncLabels={MATCHED:'الحزمة المحلية مطابقة للنسخة المعتمدة في الخادم.',UPDATE_REQUIRED:'الحزمة المحلية تحتاج تحديثًا قبل الاعتماد عليها.',NO_LOCAL_PACKAGE:'لا توجد حزمة رحلة محلية على الجهاز.',SERVER_NOT_READY:'الحزمة المعتمدة في الخادم غير جاهزة بعد.',SERVER_UNAVAILABLE:'تعذر التحقق من الخادم — لا يمكن تأكيد حداثة الحزمة المحلية.'};
 return <SafeAreaView style={s.page}><Text style={s.title}>وضع يوم الرحلة</Text><View style={s.card}><Text style={s.h}>Offline Readiness</Text><Text style={s.p}>{!loaded?'جاري فحص الحزمة المحلية…':!pkg?'لا توجد حزمة رحلة محفوظة على هذا الجهاز.':labels[freshness!]}</Text>{pkg?<><Text style={s.meta}>الإصدار: {pkg.manifestVersion}</Text><Text style={s.meta}>آخر مصدر: {new Date(pkg.sourceUpdatedAt).toLocaleString('ar-SA')}</Text></>:null}</View><View style={s.card}><Text style={s.h}>Server Package Status</Text><Text style={s.p}>{denied?'لم يعد الوصول إلى حزمة هذه الرحلة مسموحًا.':!tripId?'لم يتم تحديد رحلة.':serverError?'تعذر التحقق من حالة الحزمة من الخادم — لا تعتبر النسخة المحلية محدثة تلقائيًا.':serverStatus?`الحالة: ${serverStatus.status}${serverStatus.reason?` — ${serverStatus.reason}`:''}`:'جاري التحقق من الخادم…'}</Text>{serverStatus?.briefingVersion?<Text style={s.meta}>إصدار الإحاطة: {serverStatus.briefingVersion}</Text>:null}</View><View style={s.card}><Text style={s.h}>Package Sync</Text><Text style={s.p}>{!loaded?'جاري التحقق…':syncLabels[sync]}</Text></View><Pressable accessibilityRole="button" onPress={retry}><Text style={s.h}>إعادة التحقق من الحزمة</Text></Pressable><View style={s.card}><Text style={s.h}>Safety Readiness</Text><Text style={s.p}>حالة السلامة منفصلة عن جاهزية المحتوى دون اتصال. النسخة المحلية لا تعني أن حالة البحر أو قرار التشغيل Live، ولا تتجاوز قرار السلامة المركزي.</Text></View></SafeAreaView>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#061826',padding:24,gap:18},title:{color:'white',fontSize:28,fontWeight:'800',textAlign:'right',marginTop:20},card:{backgroundColor:'#0b2534',borderColor:'#17465b',borderWidth:1,borderRadius:22,padding:20,gap:10},h:{color:'#44d7e8',fontSize:18,fontWeight:'800',textAlign:'right'},p:{color:'#d7e7ed',fontSize:15,lineHeight:24,textAlign:'right'},meta:{color:'#9fb8c4',fontSize:13,textAlign:'right'}});
