import {getDB} from "./mongodb";
import type {QuizLane} from "./learning-quizzes";
export type QuizResult={sessionId:string;conceptId:string;lane:QuizLane;score:number;total:number;passed:boolean;points:number;attempts:number;updatedAt:string};
const shared=globalThis as typeof globalThis & {__exoQuizResults?:Map<string,QuizResult>};
const memory=shared.__exoQuizResults??(shared.__exoQuizResults=new Map<string,QuizResult>());
const key=(sessionId:string,conceptId:string,lane:QuizLane)=>sessionId+"|"+conceptId+"|"+lane;
export function cachedQuizResult(sessionId:string,conceptId:string,lane:QuizLane):QuizResult|undefined{return memory.get(key(sessionId,conceptId,lane))}
function memorySave(result:Omit<QuizResult,"attempts"|"updatedAt">):QuizResult{
 const k=key(result.sessionId,result.conceptId,result.lane),prev=memory.get(k);
 const best=prev&&prev.score>result.score?prev:result;
 const record:QuizResult={...result,score:best.score,total:best.total,passed:best.passed,points:best.points,attempts:(prev?.attempts||0)+1,updatedAt:new Date().toISOString()};
 if(memory.size>5000)memory.clear();
 memory.set(k,record);return record;
}
export async function saveQuizResult(result:Omit<QuizResult,"attempts"|"updatedAt">):Promise<{record:QuizResult;storage:"mongodb"|"temporary-server-memory"}>{
 // The quiz itself is always graded by the server. Storage failures do not
 // prevent a student from finishing the game/quiz in the current session.
 try{
  const db=await getDB();
  if(db){
   const col=db.collection<QuizResult>("quiz_results");
   const filter={sessionId:result.sessionId,conceptId:result.conceptId,lane:result.lane};
   // Atomic best-score and attempt update for concurrently submitted games.
   // A UNIQUE index on (sessionId,conceptId,lane) is still recommended in
   // production to guard against simultaneous first-time upserts.
   const updated=await col.findOneAndUpdate(filter,{
    $inc:{attempts:1},
    $max:{score:result.score,points:result.points,passed:result.passed},
    $set:{total:result.total,updatedAt:new Date().toISOString()}
   },{upsert:true,returnDocument:"after"});
   if(!updated)throw Error("Quiz record unavailable after update");
   const record:QuizResult={sessionId:result.sessionId,conceptId:result.conceptId,lane:result.lane,score:updated.score,total:updated.total,passed:updated.passed,points:updated.points,attempts:updated.attempts,updatedAt:updated.updatedAt};
   memory.set(key(result.sessionId,result.conceptId,result.lane),record);
   return {record,storage:"mongodb"};
  }
 }catch(e){console.warn("[quiz-progress] persistence unavailable; using temporary memory",e instanceof Error?e.message:"unknown")}
 return {record:memorySave(result),storage:"temporary-server-memory"};
}
export async function getQuizResults(sessionId:string,conceptId?:string):Promise<QuizResult[]>{
 const local=[...memory.values()].filter(v=>v.sessionId===sessionId&&(!conceptId||v.conceptId===conceptId));
 try{
  const db=await getDB();
  if(db){
   const rows=await db.collection<QuizResult>("quiz_results").find(conceptId?{sessionId,conceptId}:{sessionId}).limit(180).project({_id:0}).toArray() as QuizResult[];
   // Prefer permanent results but include a recent local fallback after a DB outage.
   const combined=new Map<string,QuizResult>();
   for(const row of [...rows,...local]){
    const k=key(row.sessionId,row.conceptId,row.lane),current=combined.get(k);
    if(!current||row.updatedAt>current.updatedAt)combined.set(k,row);
   }
   return [...combined.values()];
  }
 }catch(e){console.warn("[quiz-progress] read unavailable; using temporary memory",e instanceof Error?e.message:"unknown")}
 return local;
}
export function earnedAchievement(results:QuizResult[],explored:{conceptId:string;lanes:Record<string,boolean>}[]){
 const groups=new Map<string,Record<string,boolean>>();
 for(const r of results){if(!groups.has(r.conceptId))groups.set(r.conceptId,{});groups.get(r.conceptId)![r.lane]=r.passed}
 const items=[...groups].map(([conceptId,lanes])=>{
  const reviewed=explored.find(x=>x.conceptId===conceptId)?.lanes||{};
  const quizCount=["logic","course","future"].filter(k=>lanes[k]).length;
  const reviewedCount=["logic","course","future"].filter(k=>reviewed[k]).length;
  return {conceptId,quizCount,reviewedCount,covered:quizCount===3&&reviewedCount===3};
 });
 return {topics:items,covered:items.filter(x=>x.covered).length,points:results.reduce((n,r)=>n+r.points,0),badges:items.filter(x=>x.covered).map(x=>({id:"topic-covered-"+x.conceptId,title:"Topic Explorer",conceptId:x.conceptId}))};
}
