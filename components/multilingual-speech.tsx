"use client";
import {useRef,useState} from "react";
import {Mic,MicOff,Volume2} from "lucide-react";
import {speechLanguages,type SpeechLanguage} from "@/lib/speech-budget";
const names:Record<SpeechLanguage,string>={"en-IN":"English","hi-IN":"Hindi","kn-IN":"Kannada","ta-IN":"Tamil","te-IN":"Telugu","bn-IN":"Bengali","mr-IN":"Marathi","gu-IN":"Gujarati","ml-IN":"Malayalam","pa-IN":"Punjabi","od-IN":"Odia"};
export function MultilingualSpeech({sessionId,language,onLanguage,onTranscribed,lastReply}:{sessionId:string;language:SpeechLanguage;onLanguage:(x:SpeechLanguage)=>void;onTranscribed:(text:string)=>void;lastReply:string}){
 const recording=useRef<MediaRecorder|null>(null),streamRef=useRef<MediaStream|null>(null),audioRef=useRef<HTMLAudioElement|null>(null),timeout=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [active,setActive]=useState(false),[pending,setPending]=useState(false),[speaking,setSpeaking]=useState(false),[error,setError]=useState("");
 async function capture(){
  if(active){recording.current?.stop();return}
  if(!sessionId||pending)return;
  setError("");
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined"){setError("Audio recording is unavailable; use browser microphone or type.");return}
  try{
   const media=await navigator.mediaDevices.getUserMedia({audio:true});
   const type=["audio/webm;codecs=opus","audio/webm","audio/mp4"].find(t=>MediaRecorder.isTypeSupported(t))||"";
   const rec=new MediaRecorder(media,type?{mimeType:type}:undefined),parts:Blob[]=[];
   recording.current=rec;streamRef.current=media;
   rec.ondataavailable=e=>{if(e.data.size>0)parts.push(e.data)};
   rec.onstop=async()=>{
    if(timeout.current)clearTimeout(timeout.current);
    media.getTracks().forEach(track=>track.stop());recording.current=null;streamRef.current=null;setActive(false);
    const blob=new Blob(parts,{type:rec.mimeType||"audio/webm"});
    if(!blob.size)return;
    setPending(true);
    try{
     const form=new FormData();form.set("audio",blob,"student.webm");form.set("sessionId",sessionId);form.set("language",language);
     const resp=await fetch("/api/speech/transcribe",{method:"POST",body:form});
     const result=await resp.json();if(!resp.ok)throw Error(result.error||"Speech recognition unavailable");
     onTranscribed(result.transcript);
    }catch(e){setError(e instanceof Error?e.message:"Use browser speech recognition instead.")}
    finally{setPending(false)}
   };
   rec.start();setActive(true);timeout.current=setTimeout(()=>{if(rec.state==="recording")rec.stop()},11000);
  }catch{setError("Microphone permission unavailable. Try browser speech.")}
 }
 async function play(){
  if(!lastReply||speaking||!sessionId)return;
  setSpeaking(true);setError("");
  try{
   const resp=await fetch("/api/speech/speak",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId,language,text:lastReply.slice(0,460)})});
   if(!resp.ok){const error=await resp.json();throw Error(error.error||"Speech unavailable")}
   const blob=await resp.blob(),url=URL.createObjectURL(blob),audio=new Audio(url);
   audioRef.current=audio;audio.onended=()=>{URL.revokeObjectURL(url);setSpeaking(false)};audio.onerror=()=>{URL.revokeObjectURL(url);setSpeaking(false);setError("Playback failed")};
   await audio.play();
  }catch(e){setSpeaking(false);setError(e instanceof Error?e.message:"Try browser speech output.")}
 }
 return <div className="multilingual-panel" data-testid="multilingual-speech">
  <label>Voice language <select aria-label="Voice language" value={language} onChange={e=>onLanguage(e.target.value as SpeechLanguage)}>{speechLanguages.map(x=><option key={x} value={x}>{names[x]}</option>)}</select></label>
  <button onClick={capture} disabled={pending} aria-label={active?"Stop Sarvam recording":"Sarvam multilingual recognition"}>{active?<MicOff size={15}/>:<Mic size={15}/>} {pending?"Recognizing…":active?"Stop recording":"Sarvam speech input"}</button>
  <button onClick={play} disabled={!lastReply||speaking}><Volume2 size={15}/> {speaking?"Speaking…":"Play reply with Sarvam"}</button>
  <small>Optional, metered. Max 11 seconds per recording and 460 characters per spoken reply. Browser microphone remains free.</small>
  {error&&<span role="alert" className="speech-warning">{error}</span>}
 </div>;
}
