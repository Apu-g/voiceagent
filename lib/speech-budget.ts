export const speechLanguages=["en-IN","hi-IN","kn-IN","ta-IN","te-IN","bn-IN","mr-IN","gu-IN","ml-IN","pa-IN","od-IN"] as const;
export type SpeechLanguage=typeof speechLanguages[number];
export function speechLanguage(x:unknown):SpeechLanguage{return speechLanguages.includes(x as SpeechLanguage)?x as SpeechLanguage:"en-IN"}
const minutes=new Map<string,{day:string;ttsChars:number;ttsCalls:number;sttCalls:number}>();
let global={day:"",ttsChars:0,ttsCalls:0,sttCalls:0};
export function reserveSpeech(sessionId:string,kind:"tts"|"stt",characters=0):boolean{
 if(!/^[a-z0-9_-]{12,80}$/i.test(sessionId))return false;
 const day=new Date().toISOString().slice(0,10);
 if(global.day!==day)global={day,ttsChars:0,ttsCalls:0,sttCalls:0};
 const key=sessionId+"|"+day;
 const row=minutes.get(key)||{day,ttsChars:0,ttsCalls:0,sttCalls:0};
 if(minutes.size>2500)minutes.clear();
 if(kind==="tts"){
  if(characters<1||characters>500||row.ttsCalls>=6||row.ttsChars+characters>1800||global.ttsCalls>=60||global.ttsChars+characters>15000)return false;
  row.ttsCalls++;row.ttsChars+=characters;global.ttsCalls++;global.ttsChars+=characters;
 }else{
  if(row.sttCalls>=10||global.sttCalls>=120)return false;
  row.sttCalls++;global.sttCalls++;
 }
 minutes.set(key,row);return true;
}
export function speechProviderAvailable(){return !!process.env.SARVAM_API_KEY}
