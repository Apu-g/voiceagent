import {NextRequest,NextResponse} from "next/server";
import {getConcept} from "@/lib/curriculum";
import {publicQuiz,gradeQuiz,type QuizLane} from "@/lib/learning-quizzes";
import {cachedQuizResult,getQuizResults,saveQuizResult} from "@/lib/quiz-progress";
export const runtime="nodejs";
const valid=/^[a-z0-9_-]{12,80}$/i,lanes=["logic","course","future"];
function params(raw:Record<string,unknown>){const conceptId=typeof raw.conceptId==="string"?raw.conceptId:"",lane=typeof raw.lane==="string"?raw.lane:"";return getConcept(conceptId)&&lanes.includes(lane)?{conceptId,lane:lane as QuizLane}:null}
const errors={headers:{"Cache-Control":"no-store"}};
export async function GET(req:NextRequest){
 const data=params({conceptId:req.nextUrl.searchParams.get("conceptId"),lane:req.nextUrl.searchParams.get("lane")});
 if(!data)return NextResponse.json({error:"Invalid quiz topic or pathway"}, {status:400,...errors});
 const sessionId=req.nextUrl.searchParams.get("sessionId")||"",focus=(req.nextUrl.searchParams.get("focus")||"").slice(0,140);
 // Questions are deterministic curriculum content. NEVER block them on MongoDB,
 // startup connections, history, providers, or the player's session.
 let questions;
 try{questions=publicQuiz(data.conceptId,data.lane,focus)}
 catch(e){console.error("[quiz] question generation",e);return NextResponse.json({error:"Quiz content unavailable",code:"QUIZ_GENERATION_FAILED"},{status:503,...errors})}
 let best;
 if(valid.test(sessionId)){
  // History is optional enrichment, not a prerequisite for playing.
  try{
   const immediate=cachedQuizResult(sessionId,data.conceptId,data.lane);
   const saved=immediate?[immediate]:await Promise.race([getQuizResults(sessionId,data.conceptId),new Promise<never>((_,reject)=>setTimeout(()=>reject(new Error("history timeout")),900))]);
   const found=saved.find(x=>x.lane===data.lane);
   if(found)best={score:found.score,total:found.total,passed:found.passed,points:found.points,attempts:found.attempts};
  }catch{/* Quiz remains available even if saved progress is temporarily unavailable. */}
 }
 return NextResponse.json({...data,questions,best:best||null,version:1,grading:"server-authoritative"},errors);
}
export async function POST(req:NextRequest){
 let body:Record<string,unknown>;
 try{body=await req.json()}catch{return NextResponse.json({error:"Invalid request"},{status:400,...errors})}
 const data=params(body),sessionId=typeof body.sessionId==="string"?body.sessionId:"";
 if(!data||!valid.test(sessionId)||!Array.isArray(body.answers))
  return NextResponse.json({error:"Invalid quiz submission"},{status:400,...errors});
 if(body.answers.length>10)return NextResponse.json({error:"Invalid quiz length"},{status:400,...errors});
 let graded;
 try{graded=gradeQuiz(data.conceptId,data.lane,body.answers,typeof body.focus==="string"?body.focus.slice(0,140):"")}
 catch{return NextResponse.json({error:"Quiz answers are invalid",code:"INVALID_ANSWERS"},{status:400,...errors})}
 const saved=await saveQuizResult({sessionId,...data,score:graded.score,total:graded.total,passed:graded.passed,points:graded.points});
 return NextResponse.json({...graded,best:{score:saved.record.score,total:saved.record.total,passed:saved.record.passed,points:saved.record.points,attempts:saved.record.attempts},storage:saved.storage,version:1,note:saved.storage==="mongodb"?"Quiz best score saved. Points are provisional, not validated mastery.":"Quiz graded. Progress is temporarily stored in server memory; configure MongoDB for durable game achievements."},errors);
}
