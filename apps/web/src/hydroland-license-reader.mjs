
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = (typeof window==='undefined'?globalThis:window).HydrolandI18n?.createScope("license-reader", {
  "استغرقت القراءة وقتًا طويلًا. أدخل البيانات يدويًا.": "Reading took too long. Enter data manually.",
  "اختر صورة PNG أو JPEG أو ملف PDF حتى 2 ميجابايت.": "Select a PNG or JPEG image, or a PDF file up to 2 MB.",
  "جارٍ قراءة النص…": "Reading text…",
  "القراءة التلقائية تدعم حتى 6 صفحات. أدخل البيانات يدويًا لحفظ هذا الملف.": "Automatic reading supports up to 6 pages. Enter data manually to save this file.",
  "جارٍ قراءة الصفحة": "Reading page",
  "من": "of",
  "جارٍ قراءة النص… {0}٪": "Reading text… {0}%",
  "جارٍ قراءة الصفحة {0} من {1}…": "Reading page {0} of {1}…"
}) || {t:value=>value,message(text,values=[]){return this.format(text,values)},messageHTML(value){return String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},setMessage:(node,value)=>(node.textContent=value??''),attribute(name,text,values=[]){return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'},label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  // Local error identity retains authored text; server/provider messages stay opaque.
  const authoredErrors=new WeakMap();
  const localError=message=>{const error=new Error(String(message));authoredErrors.set(error,message);return error;};
  const localErrorMessage=error=>authoredErrors.get(error) ?? error?.message;

import {extractFields} from './hydroland-license-fields.mjs';
export async function readLicense(file,{signal,onProgress=()=>{}}={}){
  const controller=new AbortController();let rejectCancellation;
  const cancellation=new Promise((_,reject)=>{rejectCancellation=reject});
  const cancel=()=>{controller.abort();rejectCancellation(new DOMException('Cancelled','AbortError'))};
  signal?.addEventListener('abort',cancel,{once:true});
  const timer=setTimeout(()=>{controller.abort();rejectCancellation(localError(uiLocale.message('استغرقت القراءة وقتًا طويلًا. أدخل البيانات يدويًا.')))},90000);
  try{if(signal?.aborted)cancel();return await Promise.race([read(file,{signal:controller.signal,onProgress}),cancellation])}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel)}
}
async function read(file,{signal,onProgress}){
  if(!file?.size||file.size>2000000||!['application/pdf','image/png','image/jpeg'].includes(file.type))throw localError(uiLocale.message('اختر صورة PNG أو JPEG أو ملف PDF حتى 2 ميجابايت.'));
  let worker,loadingTask,pdf;
  const aborted=()=>{if(signal?.aborted)throw new DOMException('Cancelled','AbortError')};
  const cancel=()=>{void worker?.terminate();void loadingTask?.destroy()};
  signal?.addEventListener('abort',cancel,{once:true});

  const recognize=async canvas=>{
    aborted();
    if(!worker){
      const {default:Tesseract}=await import('/vendor/license-reader/tesseract.esm.min.js');aborted();
      worker=await Tesseract.createWorker('ara+eng',1,{workerPath:'/vendor/license-reader/worker.min.js',corePath:'/vendor/license-reader/core',langPath:'/vendor/license-reader/lang',workerBlobURL:false,logger:message=>{if(!signal?.aborted&&message.status==='recognizing text')onProgress(uiLocale.message("جارٍ قراءة النص… {0}٪", [Math.round(message.progress*100)]))}});
      if(signal.aborted){await worker.terminate();aborted()}
    }
    const {data}=await worker.recognize(canvas);aborted();return data.text;
  };
  try{
    let text='';aborted();
    if(file.type==='application/pdf'){
      const pdfjs=await import('/vendor/license-reader/pdf.min.mjs');aborted();
      pdfjs.GlobalWorkerOptions.workerSrc='/vendor/license-reader/pdf.worker.min.mjs';
      loadingTask=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,useSystemFonts:true});pdf=await loadingTask.promise;aborted();
      if(pdf.numPages>6)throw localError(uiLocale.message('القراءة التلقائية تدعم حتى 6 صفحات. أدخل البيانات يدويًا لحفظ هذا الملف.'));
      for(let i=1;i<=pdf.numPages;i++){
        aborted();onProgress(uiLocale.message("جارٍ قراءة الصفحة {0} من {1}…", [i, pdf.numPages]));
        const page=await pdf.getPage(i),content=await page.getTextContent();
        let pageText='',lastY=null;
        for(const item of content.items){if(!('str' in item))continue;const y=item.transform?.[5];if(lastY!==null&&Math.abs(y-lastY)>4)pageText+='\n';pageText+=item.str+(item.hasEOL?'\n':' ');lastY=y}
        if(pageText.trim().length<30){
          const base=page.getViewport({scale:1}),scale=Math.min(2,Math.sqrt(4000000/(base.width*base.height))),viewport=page.getViewport({scale});
          const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
          await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;pageText=await recognize(canvas);canvas.width=canvas.height=0;
        }
        text+=pageText+'\n';page.cleanup();
      }
    }else{
      const bitmap=await createImageBitmap(file);aborted();
      try{const scale=Math.min(1,Math.sqrt(4000000/(bitmap.width*bitmap.height))),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);text=await recognize(canvas);canvas.width=canvas.height=0}finally{bitmap.close()}
    }
    aborted();return extractFields(text);
  }finally{signal?.removeEventListener('abort',cancel);await worker?.terminate();await loadingTask?.destroy()}
}

export const authoredErrorMessage=error=>authoredErrors.get(error);
