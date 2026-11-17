import {NextRequest,NextResponse} from "next/server";
import {getLearningSnapshots} from "@/lib/learning-history";
import {getDB} from "@/lib/mongodb";
import {lessonRows} from "@/lib/progress-memory";
export const runtime="nodejs";
const valid=/^[0-9a-z_-]{12,80}$/i;
export async function GET(req:NextRequest){
 const sessionId=req.nextUrl.searchParams.get("sessionId")||"";
 if(!valid.test(sessionId))return NextResponse.json({error:"Invalid session"},{status:400});
 const timeline=await getLearningSnapshots(sessionId);
 let explored: Array<{conceptId:string;lanes:Record<string,boolean>}>=[];
 try{const db=await getDB();if(db)explored=await db.collection("lesson_progress").find({sessionId}).project({_id:0,conceptId:1,lanes:1}).limit(80).toArray() as typeof explored}catch{/* dashboard still shows evidence */}
 if(!explored.length)explored=lessonRows(sessionId);
 const byConcept=new Map<string,{conceptId:string;conceptTitle:string;correct:number;misconceptions:number;unverified:number;questions:number;reviewedClaims:number}>();
 for(const r of timeline.snapshots)byConcept.set(r.conceptId,{conceptId:r.conceptId,conceptTitle:r.conceptTitle,correct:r.correct,misconceptions:r.misconceptions,unverified:r.unverified,questions:r.questions,reviewedClaims:r.reviewedClaims});
 return NextResponse.json({...timeline,topics:[...byConcept.values()],explored,disclaimer:"Evidence signals are provisional and measure only explanations reviewed, not mastery or career ability."});
}
