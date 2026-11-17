import {NextRequest,NextResponse} from "next/server";
import {getConcept} from "@/lib/curriculum";
import {publicQuiz,gradeQuiz,type QuizLane} from "@/lib/learning-quizzes";
import {getQuizResults,saveQuizResult} from "@/lib/quiz-progress";
export const runtime="nodejs";
const valid=/^[a-z0-9_-]{12,80}$/i,lanes=["logic","course","future"];
function params(raw:Record<string,unknown>){const conceptId=typeof raw.conceptId==="string"?raw.conceptId:"",lane=typeof raw.lane==="string"?raw.lane:"";return getConcept(conceptId)&&lanes.includes(lane)?{conceptId,lane:lane as QuizLane}:null}
export async function GET(req:NextRequest){
 const data=params({conceptId:req.nextUrl.searchParams.get("conceptId"),lane:req.nextUrl.searchParams.get("lane")});
 if(!data)return NextResponse.json({error:"Invalid quiz topic or pathway"},{status:400});
 const sessionId=req.nextUrl.searchParams.get("sessionId")||"",focus=(req.nextUrl.searchParams.get("focus")||"").slice(0,140);
 const saved=valid.test(sessionId)?(await getQuizResults(sessionId,data.conceptId)).find(x=>x.lane===data.lane):undefined;
 return NextResponse.json({...data,questions:publicQuiz(data.conceptId,data.lane,focus),best:saved?{score:saved.score,total:saved.total,passed:saved.passed,points:saved.points,attempts:saved.attempts}:null});
}
export async function POST(req:NextRequest){
 let body:Record<string,unknown>;
 try{body=await req.json()}catch{return NextResponse.json({error:"Invalid request"},{status:400})}
 const data=params(body),sessionId=typeof body.sessionId==="string"?body.sessionId:"";
 if(!data||!valid.test(sessionId)||!Array.isArray(body.answers))return NextResponse.json({error:"Invalid quiz submission"},{status:400});
 if(body.answers.length>10)return NextResponse.json({error:"Invalid quiz length"},{status:400});
 try{
  const result=gradeQuiz(data.conceptId,data.lane,body.answers,typeof body.focus==="string"?body.focus.slice(0,140):"");
  const best=await saveQuizResult({sessionId,...data,score:result.score,total:result.total,passed:result.passed,points:result.points});
  return NextResponse.json({...result,best:{score:best.score,total:best.total,passed:best.passed,points:best.points,attempts:best.attempts},note:"Points are provisional quiz achievements, not a validated mastery score."});
 }catch{return NextResponse.json({error:"Quiz could not be scored"},{status:400})}
}