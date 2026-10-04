import { Prisma } from '@prisma/client';

type CourseState={status:string;record:{status:string;certificate:unknown}|null};
export type SessionState={status:string;startsAt:Date;endsAt:Date|null;evidence:Prisma.JsonValue|null};
export const sessionEvidence=(value:Prisma.JsonValue|null):Prisma.JsonObject=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
export const sessionHasEvidence=(value:Prisma.JsonValue|null)=>value!==null&&(typeof value!=='object'||Object.keys(value).length>0);
export const sessionRevision=(previous:Date)=>new Date(Math.max(Date.now(),previous.getTime()+1));
export const courseSchedulable=(course:CourseState)=>['PENDING','ACTIVE'].includes(course.status)&&!['COMPLETED','SUSPENDED'].includes(course.record?.status||'')&&!course.record?.certificate;
export function sessionControls(course:CourseState,session:SessionState,now=new Date()){
 const evidence=sessionEvidence(session.evidence),active=courseSchedulable(course);
 const window=Boolean(session.endsAt&&session.endsAt>now&&session.startsAt.getTime()-30*60*1000<=now.getTime());
 const attendance=['CHECK_IN_OPEN','IN_PROGRESS'].includes(session.status)&&window;
 const actions:string[]=[];
 if(active){
  if(session.status==='SCHEDULED'&&window)actions.push('OPEN');
  if(attendance&&!evidence.instructorCheckInAt)actions.push('INSTRUCTOR_CHECK_IN');
  if(attendance&&!evidence.studentCheckInAt)actions.push('STUDENT_CHECK_IN');
  if(session.status==='CHECK_IN_OPEN'&&window&&session.startsAt<=now&&evidence.instructorCheckInAt&&evidence.studentCheckInAt)actions.push('START');
  if(session.status==='IN_PROGRESS'&&evidence.startedAt&&evidence.instructorCheckInAt&&evidence.studentCheckInAt)actions.push('COMPLETE');
 }
 if(!['COMPLETED','CANCELLED'].includes(course.status)&&course.record?.status!=='COMPLETED'&&!course.record?.certificate&&!['COMPLETED','CANCELLED'].includes(session.status))actions.push('CANCEL');
 return {canReschedule:active&&session.status==='SCHEDULED'&&!sessionHasEvidence(session.evidence),actions,attendance:{instructorCheckedIn:Boolean(evidence.instructorCheckInAt),studentCheckedIn:Boolean(evidence.studentCheckInAt),instructorRecordedByCenter:evidence.instructorCheckInSource==='CENTER',studentRecordedByCenter:evidence.studentCheckInSource==='CENTER'}};
}
