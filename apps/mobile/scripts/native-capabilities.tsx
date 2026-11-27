/** QA-only adapter probe. Root copies this file into a disposable QA route.
 * It is not a production route and never contacts HTTP or uses an account. */
import {useRef,useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {AESEncryptionKey,AESKeySize,AESSealedData,aesEncryptAsync,aesDecryptAsync,randomUUID} from 'expo-crypto';
import {Directory,File,Paths} from 'expo-file-system';
import {decodeOfflineCiphertext} from '../src/offline-ciphertext';

export default function NativeCapabilities(){
 const running=useRef(false),[result,setResult]=useState('READY');
 const run=async()=>{
  if(running.current)return;running.current=true;setResult('RUNNING');
  const runId=randomUUID(),keyName='hydroland.qa.capability.'+runId;
  const directory=new Directory(Paths.document,'hydroland-capability-fixture',runId);
  const options={keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY};
  let stage='availability',failure='';
  try{
   if(!await SecureStore.isAvailableAsync())throw new Error('Unavailable');
   const plain=new TextEncoder().encode('Synthetic local fixture — اختبار محلي 🌊');
   const aad=new TextEncoder().encode('hydroland-native-capability:'+runId);
   stage='AES256';const key=await AESEncryptionKey.generate(AESKeySize.AES256);
   if(key.size!==256)throw new Error('Key size');
   const sealed=await aesEncryptAsync(plain,key,{additionalData:aad,nonce:{length:12},tagLength:16});
   const bytes=await sealed.combined();
   const roundtrip=await aesDecryptAsync(AESSealedData.fromCombined(bytes),key,{additionalData:aad});
   if(roundtrip.length!==plain.length||roundtrip.some((v,i)=>v!==plain[i]))throw new Error('Roundtrip');
   stage='ciphertext-authentication';const corrupt=bytes.slice(),index=Math.floor(corrupt.length/2);corrupt[index]=corrupt[index]!^1;
   let rejected=false;try{await aesDecryptAsync(AESSealedData.fromCombined(corrupt),key,{additionalData:aad})}catch{rejected=true}
   if(!rejected)throw new Error('Tamper accepted');
   stage='AAD-authentication';rejected=false;try{await aesDecryptAsync(AESSealedData.fromCombined(bytes),key,{additionalData:new TextEncoder().encode('wrong-scope')})}catch{rejected=true}
   if(!rejected)throw new Error('Wrong scope accepted');
   stage='SecureStore';const encoded=await key.encoded('hex');
   await SecureStore.setItemAsync(keyName,encoded,options);
   const restored=await SecureStore.getItemAsync(keyName,options);if(restored!==encoded)throw new Error('Key persistence');
   const restoredKey=await AESEncryptionKey.import(restored,'hex');
   stage='private-directory';directory.create({idempotent:true,intermediates:true});
   stage='private-file-write';
   const file=new File(directory,'encrypted.json');file.write(JSON.stringify({version:1,ciphertext:await sealed.combined('base64')}));
   stage='private-file-read';
   const stored=JSON.parse(await file.text());
   stage='private-file-decrypt';
   const reopened=await aesDecryptAsync(AESSealedData.fromCombined(decodeOfflineCiphertext(stored.ciphertext),{ivLength:12,tagLength:16}),restoredKey,{additionalData:aad});
   if(reopened.length!==plain.length||reopened.some((v,i)=>v!==plain[i]))throw new Error('Stored roundtrip');
   stage='private-file-delete';
   file.delete();if(file.exists)throw new Error('File cleanup');
   stage='SecureStore-delete';
   await SecureStore.deleteItemAsync(keyName,options);if(await SecureStore.getItemAsync(keyName,options)!==null)throw new Error('Key cleanup');
  }catch{failure=stage}
  finally{
   try{await SecureStore.deleteItemAsync(keyName,options)}catch{failure=failure||'key-cleanup'}
   try{if(directory.exists)directory.delete()}catch{failure=failure||'file-cleanup'}
   running.current=false;setResult(failure?'FAIL '+failure:'PASS');
  }
 };
 return <View style={{padding:24,gap:20,flex:1,backgroundColor:'#061826'}}><Text style={{color:'#ffffff',fontSize:20}}>HYDROLAND synthetic native capability check</Text><Pressable testID="native-capabilities-run" accessibilityRole="button" onPress={run} style={{padding:16,backgroundColor:'#44d7e8',borderRadius:12}}><Text style={{color:'#061826',fontSize:18,fontWeight:'700'}}>Run local capability check</Text></Pressable><Text testID="native-capabilities-result" accessibilityLiveRegion="polite" style={{color:'#ffffff',fontSize:24,fontWeight:'700'}}>{result}</Text></View>;
}
