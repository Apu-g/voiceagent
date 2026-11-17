import {getDB} from "./mongodb";
import type {QuizLane} from "./learning-quizzes";
export type QuizResult={sessionId:string;conceptId:string;lane:QuizLane;score:number;total:number;passed:boolean;points:number;attempts:number;updatedAt:string};
const shared=globalThis as typeof globalThis & {__exoQuizResults?:Map<string,QuizResult>};
const memory=shared.__exoQuizResults??(shared.__exoQuizResults=new Map<string,QuizResult>());
const key=(sessionId:string,conceptId:string,lane:QuizLane)=>sessionId+"|"+conceptId+"|"+lane;
export async function saveQuizResult(result:Omit<QuizResult,"attempts"|"updatedAt">):Promise<QuizResult>{
 const k=key(result.sessionId,result.conceptId,result.lane),col=await collection();
 if(col){
  // Update only if score is improved; attempts increase on every submission.
  const current=await col.findOne({sessionId:result.sessionId,conceptId:result.conceptId,lane:result.lane});
  const best=current&&current.score>result.score?current:result;
  const record:QuizResult={...result,score:best.score,total:best.total,passed:best.passed,points:best.points,attempts:(current?.attempts||0)+1,updatedAt:new Date().toISOString()};
  await col.updateOne({sessionId:result.sessionId,conceptId:result.conceptId,lane:result.lane},{$set:record},{upsert:true});return record;
 }
 const prev=memory.get(k),best=prev&&prev.score>result.score?prev:result;
 const record:QuizResult={...result,score:best.score,total:best.total,passed:best.passed,points:best.points,attempts:(prev?.attempts||0)+1,updatedAt:new Date().toISOString()};
 if(memory.size>5000)memory.clear();memory.set(k,record);return record;
}
async function collection(){try{const db=await getDB();return db?.collection<QuizResult>("quiz_results")||null}catch{return null}}
export async function getQuizResults(sessionId:string,conceptId?:string):Promise<QuizResult[]>{
 const col=await collection();if(col)return col.find(conceptId?{sessionId,conceptId}:{sessionId}).limit(180).project({_id:0}).toArray() as Promise<QuizResult[]>;
 return [...memory.values()].filter(v=>v.sessionId===sessionId&&(!conceptId||v.conceptId===conceptId));
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
