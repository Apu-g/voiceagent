import {NextRequest,NextResponse} from "next/server";
import {reserveSpeech,speechLanguage} from "@/lib/speech-budget";
export const runtime="nodejs";export const maxDuration=20;
export async function POST(req:NextRequest){
 if(!process.env.SARVAM_API_KEY)return NextResponse.json({error:"Sarvam is not configured. Use browser speech recognition."},{status:503});
 if(Number(req.headers.get("content-length")||0)>1500000)return NextResponse.json({error:"Audio is too large"},{status:413});
 let form:FormData;try{form=await req.formData()}catch{return NextResponse.json({error:"Invalid audio"},{status:400})}
 const audio=form.get("audio"),sessionId=form.get("sessionId"),language=speechLanguage(form.get("language"));
 if(!(audio instanceof File)||audio.size<500||audio.size>1250000||typeof sessionId!=="string")return NextResponse.json({error:"Audio must be a short clip"},{status:400});
 if(!reserveSpeech(sessionId,"stt"))return NextResponse.json({error:"Daily speech limit reached; use browser speech recognition."},{status:429});
 const data=new FormData();data.set("file",audio,"student.webm");data.set("model","saaras:v4");data.set("mode",language==="en-IN"?"transcribe":"translate");
 try{
  const r=await fetch("https://api.sarvam.ai/speech-to-text",{method:"POST",headers:{"api-subscription-key":process.env.SARVAM_API_KEY},body:data,signal:AbortSignal.timeout(13500)});
  if(!r.ok)return NextResponse.json({error:r.status===402?"Speech credits exhausted. Switch to browser recognition.":"Speech recognition unavailable. Use browser recognition."},{status:r.status===402?402:502});
  const obj=await r.json() as {transcript?:string;language_code?:string};
  if(typeof obj.transcript!=="string"||!obj.transcript.trim())throw Error("Empty transcript");
  return NextResponse.json({transcript:obj.transcript.slice(0,1700),language,sourceLanguage:obj.language_code||language,translated:language!=="en-IN",provider:"sarvam"});
 }catch{return NextResponse.json({error:"Speech recognition unavailable; browser fallback remains available."},{status:502})}
}
