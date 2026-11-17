import {NextRequest,NextResponse} from "next/server";
import {getLearningSnapshots} from "@/lib/learning-history";
import {getQuizResults} from "@/lib/quiz-progress";
import {lessonRows,type LessonProgressRow} from "@/lib/progress-memory";
import {getDB} from "@/lib/mongodb";
import {createDashboardSummary} from "@/lib/student-dashboard";
export const runtime="nodejs";
export async function GET(req:NextRequest){
 const sessionId=req.nextUrl.searchParams.get("sessionId")||"";
 if(!/^[a-z0-9_-]{12,80}$/i.test(sessionId))return NextResponse.json({error:"Invalid session"},{status:400});
 try{
  const [history,quizzes]=await Promise.all([getLearningSnapshots(sessionId),getQuizResults(sessionId)]);
  let paths:LessonProgressRow[]=[];
  try{const db=await getDB();if(db)paths=await db.collection<LessonProgressRow>("lesson_progress").find({sessionId}).project({_id:0}).limit(150).toArray() as LessonProgressRow[]}catch{/* fallback below */}
  if(!paths.length)paths=lessonRows(sessionId);
  return NextResponse.json({...createDashboardSummary(history.snapshots,quizzes,paths),storage:history.storage,disclaimer:"Evidence from conversations is provisional. Questions, missing answers, video views and quiz scores are not proof of mastery."},{headers:{"Cache-Control":"private, no-store"}});
 }catch{return NextResponse.json({error:"Could not load your learning dashboard"},{status:503})}
}
