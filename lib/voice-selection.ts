export type VoiceCandidate={name:string;lang:string;default?:boolean};
// Browsers do not expose a gender field. Choose known male voice names rather
// than claiming that lowering the pitch makes a voice male.
const maleNames=[/microsoft (ravi|david|mark|guy|ryan|george|prabhat)\b/i,/google uk english male/i,/\b(daniel|alex|fred|arthur|aaron|thomas|oliver|rishi)\b/i,/\bmale\b/i];
export function preferredMaleVoice<T extends VoiceCandidate>(voices:T[],language="en-IN"):T|undefined{
 const male=voices.filter(v=>maleNames.some(x=>x.test(v.name))&&!/female/i.test(v.name));
 const lang=language.toLowerCase(),base=lang.split("-")[0];
 return male.find(v=>v.lang.toLowerCase()===lang)
  ||male.find(v=>v.lang.toLowerCase().split("-")[0]===base)
  ||(base==="en"?male.find(v=>v.lang.toLowerCase().startsWith("en-")):undefined);
}
export function clearSpeechSettings(){return {rate:0.94,pitch:1,volume:1} as const}
export const sarvamMaleSpeakers:Record<string,{model:"bulbul:v3"|"bulbul:v4-flash";speaker:string}>={
 "en-IN":{model:"bulbul:v4-flash",speaker:"dev_en_conversational"},
 "hi-IN":{model:"bulbul:v4-flash",speaker:"tarun_hi_conversational"},
 "kn-IN":{model:"bulbul:v3",speaker:"shubh"},
 "te-IN":{model:"bulbul:v3",speaker:"shubh"},
 "bn-IN":{model:"bulbul:v3",speaker:"rehan"},
 "ta-IN":{model:"bulbul:v3",speaker:"ratan"},
 "mr-IN":{model:"bulbul:v3",speaker:"ratan"},
 "gu-IN":{model:"bulbul:v3",speaker:"ratan"},
 "ml-IN":{model:"bulbul:v3",speaker:"shubh"},
 "pa-IN":{model:"bulbul:v3",speaker:"mani"},
 "od-IN":{model:"bulbul:v3",speaker:"shubh"}
};
export function sarvamVoiceFor(language:string){
 return sarvamMaleSpeakers[language]||sarvamMaleSpeakers["en-IN"];
}
