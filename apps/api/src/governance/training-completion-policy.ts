type Skill={status:string;signedOffByInstructorId?:string|null;signedOffAt?:unknown};
type RecordState={stages:{skills:Skill[]}[];sessions:{status:string}[]};
export const trainingRecordEditable=(record:{status:string;certificate:unknown;enrollment:{status:string}})=>['PENDING','ACTIVE'].includes(record.enrollment.status)&&!['COMPLETED','SUSPENDED'].includes(record.status)&&!record.certificate;
export function trainingCompletion(record:RecordState){
 const skills=record.stages.flatMap(stage=>stage.skills);
 const signed=skills.filter(skill=>skill.status==='COMPETENT'&&Boolean(skill.signedOffByInstructorId&&skill.signedOffAt)).length;
 const reasons:string[]=[];
 if(!skills.length)reasons.push('أضف مهارة واحدة على الأقل إلى خطة التدريب.');
 if(record.stages.some(stage=>!stage.skills.length))reasons.push('أضف مهارات لكل مرحلة في خطة التدريب.');
 if(signed<skills.length)reasons.push('أكمل تقييم جميع المهارات مع توقيع المدرب.');
 if(!record.sessions.some(session=>session.status==='COMPLETED'))reasons.push('أكمل جلسة تدريب واحدة على الأقل.');
 if(record.sessions.some(session=>!['COMPLETED','CANCELLED'].includes(session.status)))reasons.push('أكمل الجلسات المفتوحة أو ألغها قبل إتمام الدورة.');
 return {progressPercent:skills.length?Math.min(signed===skills.length?100:99,Math.round(100*signed/skills.length)):0,skillCount:skills.length,signedSkillCount:signed,reasons,ready:reasons.length===0};
}
