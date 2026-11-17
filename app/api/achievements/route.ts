import {NextRequest,NextResponse} from "next/server";
import {getDB} from "@/lib/mongodb";
import {lessonRows} from "@/lib/progress-memory";
import {getQuizResults,earnedAchievement} from "@/lib/quiz-progress";
export const runtime="nodejs";
export async function GET(req:NextRequest){
 const sessionId=req.nextUrl.searchParams.get("sessionId")||"";
 if(!/^[a-z0-9_-]{12,80}$/i.test(sessionId))return NextResponse.json({error:"Invalid session"},{status:400});
 const results=await getQuizResults(sessionId);
 let explored:Array<{conceptId:string;lanes:Record<string,boolean>}>=[];
 try{const db=await getDB();if(db)explored=await db.collection("lesson_progress").find({sessionId}).project({_id:0,conceptId:1,lanes:1}).limit(160).toArray() as typeof explored}catch{};
 if(!explored.length)explored=lessonRows(sessionId);
 return NextResponse.json({...earnedAchievement(results,explored),quizResults:results});
}