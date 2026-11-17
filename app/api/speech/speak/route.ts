import {NextRequest,NextResponse} from "next/server";
import {reserveSpeech,speechLanguage} from "@/lib/speech-budget";
import {sarvamVoiceFor} from "@/lib/voice-selection";
export const runtime="nodejs";export const maxDuration=20;
export async function POST(req:NextRequest){
 if(!process.env.SARVAM_API_KEY)return NextResponse.json({error:"Sarvam unavailable"},{status:503});
 let body:Record<string,unknown>;try{body=await req.json()}catch{return NextResponse.json({error:"Bad request"},{status:400})}
 const text=typeof body.text==="string"?body.text.trim():"",sessionId=typeof body.sessionId==="string"?body.sessionId:"",language=speechLanguage(body.language);
 if(!text||text.length>500)return NextResponse.json({error:"Keep speech under 500 characters"},{status:400});
 if(!reserveSpeech(sessionId,"tts",text.length))return NextResponse.json({error:"Daily audio budget reached; use browser speech."},{status:429});
 try{
  const res=await fetch("https://api.sarvam.ai/text-to-speech",{method:"POST",headers:{"api-subscription-key":process.env.SARVAM_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({text,...sarvamVoiceFor(language),language_code:language,output_audio_codec:"mp3",speech_sample_rate:22050,pace:0.96,enable_preprocessing:true}),signal:AbortSignal.timeout(14500)});
  if(!res.ok)return NextResponse.json({error:res.status===402?"Speech credits exhausted.":"Speech synthesis unavailable."},{status:res.status===402?402:502});
  const result=await res.json() as {audios?:string[]};
  if(!result.audios?.[0]||result.audios[0].length>2200000)throw Error("No audio");
  const audio=Buffer.from(result.audios[0],"base64");
  return new NextResponse(audio,{headers:{"Content-Type":"audio/mpeg","Cache-Control":"private, no-store","X-Voice-Provider":"sarvam"}});
 }catch{return NextResponse.json({error:"Speech unavailable; use browser speech."},{status:502})}
}
