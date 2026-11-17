import {NextRequest,after} from "next/server";
import {buildMessages,chooseContext,localReply,quickMentorReply,type SessionInput} from "@/lib/tutor";
import {retrieveTextbook} from "@/lib/textbook";
import {getDB} from "@/lib/mongodb";
import {eventFrame,parseSSE} from "@/lib/sse";
export const runtime="nodejs";
export const maxDuration=30;
const requests=new Map<string,{count:number;expires:number}>();
function prepare(x:unknown):SessionInput|null{
 if(!x||typeof x!=="object")return null;
 const b=x as Record<string,unknown>;
 if(typeof b.message!=="string"||!b.message.trim()||b.message.length>2500)return null;
 if(b.history!==undefined&&!Array.isArray(b.history))return null;
 return {message:b.message.trim(),conceptId:typeof b.conceptId==="string"?b.conceptId:undefined,chapter:typeof b.chapter==="string"?b.chapter:undefined,
  mode:b.mode==="quiz"?"quiz":"learn",history:(Array.isArray(b.history)?b.history:[])
  .filter((t:unknown)=>!!t&&typeof t==="object"&&["student","exo"].includes((t as {role?:string}).role||"")&&typeof (t as {text?:string}).text==="string")
  .slice(-16).map((t:{role:"student"|"exo";text:string})=>({role:t.role,text:t.text.slice(0,850)})),
  sessionId:typeof b.sessionId==="string"&&/^[0-9a-z-]{12,80}$/i.test(b.sessionId)?b.sessionId:undefined,
  languageCode:typeof b.languageCode==="string"&&/^(en|hi|kn|ta|te|bn|mr|gu|ml|pa|od)-IN$/.test(b.languageCode)?b.languageCode:"en-IN"};
}
export async function POST(req:NextRequest){
 const ip=(req.headers.get("x-forwarded-for")||"local").split(",")[0].trim(),now=Date.now();
 const current=requests.get(ip);const bucket=current&&current.expires>now?current:{count:0,expires:now+60000};bucket.count++;requests.set(ip,bucket);
 if(bucket.count>35)return Response.json({error:"Too many requests"},{status:429});
 let input:SessionInput|null=null;
 try{input=prepare(await req.json())}catch{/* malformed input */}
 if(!input)return Response.json({error:"Invalid conversation turn"},{status:400});
 const context=chooseContext(input),lead=context[0];
 const grade=lead?.grade??10,subject=lead?.subject??"Science";
 const sources=lead?.chapter.startsWith("Beyond the Classroom")?[]:retrieveTextbook({query:input.message+" "+(lead?.title||""),chapter:lead?.chapter,grade,subject,limit:3});
 const referenceList=[
  ...context.slice(0,2).map(c=>({kind:"curated",title:c.title,chapter:c.chapter,id:c.id})),
  ...sources.map(s=>({kind:"textbook",title:s.title,chapter:s.chapter,page:s.page,id:s.id,bookId:s.bookId,grade:s.grade,subject:s.subject,excerpt:s.excerpt.slice(0,200)}))
 ];
 const messages=buildMessages(input,context,sources);
 const quick=quickMentorReply(input.message,lead);
 let answer="",provider=quick?"mentor-rules":"groq";
 const encoder=new TextEncoder();
 let resolvePersist:()=>void=()=>{};
 const finished=new Promise<void>(resolve=>{resolvePersist=resolve});
 if(input.sessionId){
  const sessionId=input.sessionId,conceptId=lead?.id||null,message=input.message;
  after(async()=>{
   await finished;
   if(!answer||req.signal.aborted)return;
   try{const db=await getDB();await db?.collection("turns").insertOne({sessionId,createdAt:new Date(),studentText:message,exoText:answer.slice(0,3500),conceptId,provider});}catch{/* non-critical student prototype logging */}
  });
 }
 const readable=new ReadableStream<Uint8Array>({
  async start(controller){
   const emit=(kind:string,value:unknown)=>{if(!req.signal.aborted)try{controller.enqueue(encoder.encode(eventFrame(kind,value)))}catch{/* disconnected */}};
   emit("metadata",{concept:lead||null,sources:referenceList,mode:"streaming",stt:"browser"});
   try{
    if(quick){answer=quick;emit("token",{text:quick});}
    else if(!process.env.GROQ_API_KEY){provider="offline-study-notes";answer=localReply(input!,context);emit("token",{text:answer});}
    else{
     const response=await fetch("https://api.groq.com/openai/v1/chat/completions",{
      method:"POST",
      headers:{"Authorization":"Bearer "+process.env.GROQ_API_KEY,"Content-Type":"application/json"},
      body:JSON.stringify({model:process.env.GROQ_MODEL||"openai/gpt-oss-20b",messages,stream:true,temperature:0.45,max_tokens:330}),
      signal:AbortSignal.any([req.signal,AbortSignal.timeout(24000)]),cache:"no-store"
     });
     if(!response.ok||!response.body)throw Error("Groq response unavailable");
     const reader=response.body.getReader();const decoder=new TextDecoder();let left="";
     while(true){
      const {done,value}=await reader.read();if(done)break;
      left=parseSSE(left+decoder.decode(value,{stream:true}),({data})=>{
       if(typeof data!=="object"||!data)return;
       const chunk=(data as {choices?:Array<{delta?:{content?:string}}>}).choices?.[0]?.delta?.content;
       if(typeof chunk==="string"&&answer.length<4100){answer+=chunk;emit("token",{text:chunk});}
      });
     }
     if(!answer.trim())throw Error("Empty model response");
    }
   }catch{
    if(!req.signal.aborted){
     provider="offline-study-notes";
     if(!answer.trim()){answer=localReply(input!,context);emit("token",{text:answer})}
     emit("warning",{message:"Live model unavailable; used verified study notes."});
    }
   }finally{
    emit("done",{provider,answerLength:answer.length,concept:lead||null,sources:referenceList});
    resolvePersist();
    try{controller.close()}catch{/* disconnected */}
   }
  },
  cancel(){resolvePersist();}
 });
 return new Response(readable,{headers:{"Content-Type":"text/event-stream; charset=utf-8","Cache-Control":"no-cache, no-transform","X-Accel-Buffering":"no","Connection":"keep-alive"}});
}
