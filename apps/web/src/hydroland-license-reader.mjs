import {extractFields} from './hydroland-license-fields.mjs';
export async function readLicense(file,{signal,onProgress=()=>{}}={}){
  const controller=new AbortController();let rejectCancellation;
  const cancellation=new Promise((_,reject)=>{rejectCancellation=reject});
  const cancel=()=>{controller.abort();rejectCancellation(new DOMException('Cancelled','AbortError'))};
  signal?.addEventListener('abort',cancel,{once:true});
  const timer=setTimeout(()=>{controller.abort();rejectCancellation(new Error('استغرقت القراءة وقتًا طويلًا. أدخل البيانات يدويًا.'))},90000);
  try{if(signal?.aborted)cancel();return await Promise.race([read(file,{signal:controller.signal,onProgress}),cancellation])}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel)}
}
async function read(file,{signal,onProgress}){
  if(!file?.size||file.size>2000000||!['application/pdf','image/png','image/jpeg'].includes(file.type))throw new Error('اختر صورة PNG أو JPEG أو ملف PDF حتى 2 ميجابايت.');
  let worker,loadingTask,pdf;
  const aborted=()=>{if(signal?.aborted)throw new DOMException('Cancelled','AbortError')};
  const cancel=()=>{void worker?.terminate();void loadingTask?.destroy()};
  signal?.addEventListener('abort',cancel,{once:true});

  const recognize=async canvas=>{
    aborted();
    if(!worker){
      const {default:Tesseract}=await import('/vendor/license-reader/tesseract.esm.min.js');aborted();
      worker=await Tesseract.createWorker('ara+eng',1,{workerPath:'/vendor/license-reader/worker.min.js',corePath:'/vendor/license-reader/core',langPath:'/vendor/license-reader/lang',workerBlobURL:false,logger:message=>{if(!signal?.aborted&&message.status==='recognizing text')onProgress(`جارٍ قراءة النص… ${Math.round(message.progress*100)}٪`)}});
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
      if(pdf.numPages>6)throw new Error('القراءة التلقائية تدعم حتى 6 صفحات. أدخل البيانات يدويًا لحفظ هذا الملف.');
      for(let i=1;i<=pdf.numPages;i++){
        aborted();onProgress(`جارٍ قراءة الصفحة ${i} من ${pdf.numPages}…`);
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
  }finally{signal?.removeEventListener('abort',cancel);await worker?.terminate();if(pdf)await pdf.destroy();else await loadingTask?.destroy()}
}
