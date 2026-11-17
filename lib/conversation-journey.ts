import {resolveConversationFocus,isStudyQuestion} from "./conversation-focus";
import {analyzeAnswers} from "./learning-engine";
import {getConcept} from "./curriculum";
export type JourneyStep={index:number;text:string;focus:string;kind:"question"|"supported"|"misconception"|"off-topic"|"unverified";signal:number;why:string;next:string;evidence?:string};
export function explainConversationJourney(selectedId:string,turns:string[]):JourneyStep[]{
 const clean=turns.filter(x=>typeof x==="string").slice(-24).map(x=>x.trim().slice(0,900)).filter(Boolean);
 const target=resolveConversationFocus(selectedId,clean).conceptId;
 const results:JourneyStep[]=[];
 for(let i=0;i<clean.length;i++){
  const text=clean[i],detected=resolveConversationFocus(selectedId,clean.slice(0,i+1)),focus=detected.conceptId;
  const relevant=focus===target;
  const q=isStudyQuestion(text)||/^(how|why|what|i want|can|does|is|are|tell)/i.test(text);
  const analysed=!q&&relevant?analyzeAnswers(target,[text]):null;
  const hit=analysed?.evidence.find(e=>e.status==="misconception"||e.status==="correct");
  let kind:JourneyStep["kind"],signal:number,why:string,next:string;
  if(!relevant&&detected.confidence!=="low"){kind="off-topic";signal=0;why="Conversation shifted to "+(getConcept(focus)?.title||"another topic")+".";next="Keep this as a separate curiosity; return to the chosen lesson when ready."}
  else if(q){kind="question";signal=1;why="Asked a question; this is curiosity, not proof of misunderstanding.";next="Answer it, then ask for a short explanation in the student's words."}
  else if(hit?.status==="misconception"){kind="misconception";signal=0;why="Possible misconception: "+hit.objective+".";next="Review one example and confirm with a new question."}
  else if(hit?.status==="correct"){kind="supported";signal=2;why="A supporting claim was detected: "+hit.objective+".";next="Check transfer with a new example."}
  else if(/^[a-z\s]{1,25}$/i.test(text)){kind="off-topic";signal=0;why="Short or unclear speech fragment; meaning not established.";next="Ask for clarification instead of inferring mastery or an error."}
  else{kind="unverified";signal=1;why="No reliable topic-specific claim was detected.";next="Ask one focused diagnostic question."}
  results.push({index:i+1,text,focus,kind,signal,why,next,evidence:hit?.quote});
 }
 return results;
}
