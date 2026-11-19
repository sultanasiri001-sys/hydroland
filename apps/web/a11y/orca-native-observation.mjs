// Observe the real Orca debug log. These helpers never synthesize events,
// generate speech, change preferences, or replace PCM acceptance.
const loadStart='vvvvv PROCESS OBJECT EVENT document:load-complete';
const loadEnd='^^^^^ PROCESS OBJECT EVENT document:load-complete ^^^^^';
const controlStart="vvvvv PROCESS ATSPI_KEY_PRESSED_EVENT: 'Control_L'";
const controlEnd="^^^^^ PROCESS ATSPI_KEY_PRESSED_EVENT: 'Control_L'";

function completedBlocks(log,start,end){
  const result=[];
  let offset=0;
  for(;;){
    const from=log.indexOf(start,offset);
    if(from<0)break;
    const to=log.indexOf(end,from+start.length);
    if(to<0)break;
    const next=log.indexOf(start,from+start.length);
    if(next>=0&&next<to){offset=next;continue;}
    result.push({text:log.slice(from,to+end.length),endOffset:to+end.length});
    offset=to+end.length;
  }
  return result;
}

export function processedDocumentLoad(log,{title,uri}){
  if(!title||!uri)return null;
  for(const block of completedBlocks(log,loadStart,loadEnd)){
    const event=block.text.split('\n').find(line=>line.includes("OBJECT EVENT: document:load-complete for [document web: '"+title+"']"));
    const attributes=block.text.split('\n').find(line=>line.includes('AXDocument: Attributes of ')&&line.includes("'Title': '"+title+"'")&&line.includes("'URI': '"+uri+"'"));
    if(event&&attributes&&block.text.includes('Processing document:load-complete: script for event is active')){
      return {event,attributes,endOffset:block.endOffset};
    }
  }
  return null;
}

export function nativeControlInterruption(log){
  for(const block of completedBlocks(log,controlStart,controlEnd)){
    const interruption=block.text.split('\n').find(line=>line.includes('DEFAULT: Interrupting presentation'));
    if(interruption)return {interruption,endOffset:block.endOffset};
  }
  return null;
}

// Native document loading and the following asynchronous Say All/live-region
// queue can arrive after DOMContentLoaded. Wait for the real load event and a
// short stable presentation queue before the ordinary interrupt key. This is
// a startup boundary, not evidence that the audio is quiet or that a control
// has been announced; the unchanged PCM/name/voice assertions establish those.
export function createNativeStartupBarrier(document){
  let lastActivity=-1;
  let stableSince=null;
  return (log,nowMs)=>{
    const load=processedDocumentLoad(log,document);
    if(!load){lastActivity=-1;stableSince=null;return null;}
    const presentations=[...log.matchAll(/^.*(?:SPEECH DISPATCHER: Speaking|WEB SAY ALL:|WEB: Doing SayAll).*$/gm)];
    const activity=Math.max(load.endOffset,presentations.at(-1)?.index??-1);
    if(activity!==lastActivity){lastActivity=activity;stableSince=nowMs;}
    const stableForMs=nowMs-stableSince;
    if(stableForMs<600)return null;
    return {...load,lastPresentationOffset:lastActivity,stableForMs};
  };
}
