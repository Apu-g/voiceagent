import {getDB} from "./mongodb";
import type {Roadmap} from "./learning-engine";
export type LearningSnapshot={sessionId:string;conceptId:string;conceptTitle:string;createdAt:string;reviewedClaims:number;correct:number;misconceptions:number;unverified:number;questions:number;confidence:string};
const shared=globalThis as typeof globalThis & {__exoSnapshots?:Map<string,LearningSnapshot[]>};
const memory=shared.__exoSnapshots??(shared.__exoSnapshots=new Map<string,LearningSnapshot[]>());
export function summarizeSnapshot(sessionId:string,roadmap:Roadmap,questions:number,createdAt=new Date()):LearningSnapshot{
 const e=roadmap.analysis.evidence;return {sessionId,conceptId:roadmap.analysis.conceptId,conceptTitle:roadmap.analysis.conceptTitle,createdAt:createdAt.toISOString(),
  reviewedClaims:roadmap.analysis.studentTurns,correct:e.filter(x=>x.status==="correct").length,misconceptions:e.filter(x=>x.status==="misconception").length,
  unverified:e.filter(x=>x.status==="unverified").length,questions,confidence:roadmap.analysis.confidence};
}
export async function recordLearningSnapshot(sessionId:string,roadmap:Roadmap,questions:number){
 const snapshot=summarizeSnapshot(sessionId,roadmap,questions);
 const old=memory.get(sessionId)||[];memory.set(sessionId,[...old,snapshot].slice(-24));
 if(memory.size>1200)memory.clear();
 try{const db=await getDB();await db?.collection("learning_snapshots").insertOne({...snapshot,createdDate:new Date(snapshot.createdAt)})}catch{/* local session fallback */}
 return snapshot;
}
export async function getLearningSnapshots(sessionId:string):Promise<{snapshots:LearningSnapshot[];storage:string}>{
 try{
  const db=await getDB();
  if(db){
   const rows=await db.collection("learning_snapshots").find({sessionId}).sort({createdDate:-1}).limit(24).project({_id:0,createdDate:0}).toArray() as LearningSnapshot[];
   return {snapshots:rows.reverse(),storage:"mongodb"};
  }
 }catch{/* use local memory */}
 return {snapshots:memory.get(sessionId)||[],storage:"temporary-server-memory"};
}
