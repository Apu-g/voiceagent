import {NextRequest,NextResponse,after} from "next/server";
import {complete} from "@/lib/providers";
import {getDB} from "@/lib/mongodb";
import {retrieveTextbook} from "@/lib/textbook";
import {buildMessages,chooseContext,classify,localReply,quickMentorReply,SessionInput} from "@/lib/tutor";
export const runtime="nodejs";
export const maxDuration=30;
const buckets=new Map<string,{count:number;reset:number}>();
export async function POST(req:NextRequest){
 try{
  const ip=(req.headers.get("x-forwarded-for")||"local").split(",")[0].trim();
  const now=Date.now();const old=buckets.get(ip);const bucket=!old||old.reset<now?{count:0,reset:now+60000}:old;bucket.count++;buckets.set(ip,bucket);
  if(bucket.count>24)return NextResponse.json({error:"Too many requests. Try again in a minute."},{status:429});
  const body=await req.json() as SessionInput;
  if(typeof body.message!=="string"||!body.message.trim()||body.message.length>2500)return NextResponse.json({error:"Message must be between 1 and 2500 characters."},{status:400});
  if(body.history&&!Array.isArray(body.history))return NextResponse.json({error:"Invalid history"},{status:400});
  const input:SessionInput={message:body.message,chapter:typeof body.chapter==="string"?body.chapter:undefined,conceptId:typeof body.conceptId==="string"?body.conceptId:undefined,mode:body.mode==="quiz"?"quiz":"learn",history:(body.history||[]).filter(t=>t&&["student","exo"].includes(t.role)&&typeof t.text==="string").slice(-16),sessionId:typeof body.sessionId==="string"?body.sessionId.slice(0,80):undefined,languageCode:typeof body.languageCode==="string"&&/^(en|hi|kn|ta|te|bn|mr|gu|ml|pa|od)-IN$/.test(body.languageCode)?body.languageCode:"en-IN"};
  const context=chooseContext(input);const lead=context[0];
  const pdf=lead?.chapter.startsWith("Beyond the Classroom")?[]:retrieveTextbook({query:input.message+" "+(lead?.title||""),grade:lead?.grade??10,subject:lead?.subject??"Science",chapter:lead?.chapter,limit:3});
  let answer:string;let provider:string;
  const instant=quickMentorReply(input.message,context[0]);
  if(instant){answer=instant;provider="mentor-rules";}
  else try{const response=await complete(buildMessages(input,context,pdf));answer=response.text;provider=response.provider;}
  catch{answer=localReply(input,context);provider="offline-study-notes";}
  const decision=context[0]?classify(input.message,context[0]):null;
  // Anonymous prototype: persistence is scoped to a random client session, not an authenticated student.
  // Do not use these records to assign grades or authenticated mastery.
  if(input.sessionId){
    const record={sessionId:input.sessionId,createdAt:new Date(),studentText:input.message.slice(0,2500),exoText:answer.slice(0,3000),conceptId:context[0]?.id||null,provider,decision};
    after(async()=>{try{const db=await getDB();await db?.collection("turns").insertOne(record)}catch{/* Best-effort anonymous prototype logging */}});
  }
  return NextResponse.json({answer,provider,concept:context[0]||null,sources:[...context.map(c=>({id:c.id,title:c.title,chapter:c.chapter,kind:"curated"})),...pdf.map(s=>({id:s.id,title:s.title,chapter:s.chapter,kind:"textbook",page:s.page}))],decision});
 }catch{return NextResponse.json({error:"Unable to process this request."},{status:500});}
}
