import {NextRequest,NextResponse} from "next/server";
import {getConcept} from "@/lib/curriculum";
import {getDB} from "@/lib/mongodb";
import {lessonMemory,lessonRows,type LessonProgressRow} from "@/lib/progress-memory";
export const runtime="nodejs";
const validSession=/^[a-z0-9_-]{12,80}$/i;
const memory=lessonMemory();
type Row=LessonProgressRow;
async function storage(){
 try{const db=await getDB();return db?.collection<Row>("lesson_progress")||null;}catch{return null}
}
export async function GET(req:NextRequest){
 const sessionId=req.nextUrl.searchParams.get("sessionId")||"";
 if(!validSession.test(sessionId))return NextResponse.json({error:"Invalid session"},{status:400});
 const col=await storage();
 const items=col?await col.find({sessionId}).project({_id:0}).limit(150).toArray():lessonRows(sessionId);
 const completed=items.reduce((n,r)=>n+Object.values(r.lanes).filter(Boolean).length,0);
 return NextResponse.json({items,completed,storage:col?"mongodb":"temporary-server-memory",note:"Completion is a self-reported study activity, not mastery."});
}
export async function POST(req:NextRequest){
 let raw:Record<string,unknown>={};
 try{raw=await req.json()}catch{return NextResponse.json({error:"Invalid JSON"},{status:400})}
 const sessionId=typeof raw.sessionId==="string"?raw.sessionId:"",conceptId=typeof raw.conceptId==="string"?raw.conceptId:"";
 const lane=raw.lane,videoId=raw.videoId;
 if(raw.action==="video"){
  if(!validSession.test(sessionId)||!getConcept(conceptId)||typeof videoId!=="string"||!/^[A-Za-z0-9_-]{11}$/.test(videoId))return NextResponse.json({error:"Invalid video event"},{status:400});
  const col=await storage(),updatedAt=new Date().toISOString();
  if(col)await col.updateOne({sessionId,conceptId},{$addToSet:{videoReviews:videoId},$set:{updatedAt},$setOnInsert:{sessionId,conceptId,lanes:{}}},{upsert:true});
  else{const key=sessionId+"|"+conceptId,old=memory.get(key)||{sessionId,conceptId,lanes:{},updatedAt};memory.set(key,{...old,videoReviews:[...new Set([...(old.videoReviews||[]),videoId])],updatedAt})}
  return NextResponse.json({ok:true,note:"Student marked as watched; playback was not independently verified."});
 }
 if(!validSession.test(sessionId)||!getConcept(conceptId)||!["logic","course","future"].includes(String(lane))||typeof raw.completed!=="boolean")
  return NextResponse.json({error:"Invalid progress record"},{status:400});
 const key=sessionId+"|"+conceptId,updatedAt=new Date().toISOString(),col=await storage();
 if(col)await col.updateOne({sessionId,conceptId},{$set:{["lanes."+lane]:raw.completed,updatedAt},$setOnInsert:{sessionId,conceptId}},{upsert:true});
 else{
  if(memory.size>2000)memory.clear();
  const previous=memory.get(key)||{sessionId,conceptId,lanes:{},updatedAt};
  memory.set(key,{...previous,lanes:{...previous.lanes,[String(lane)]:raw.completed},updatedAt});
 }
 return NextResponse.json({ok:true,storage:col?"mongodb":"temporary-server-memory",note:"Marked as reviewed by student; no automatic mastery claim."});
}
