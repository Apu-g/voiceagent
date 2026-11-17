import {allConcepts,getConcept,type Concept} from "./curriculum";
export type ConversationFocus={conceptId:string;confidence:"high"|"medium"|"low";reason:string;relevantTurns:string[];questions:string[]};
const noise=/^(hi|hello|okay|ok|yes|no|latest|tomato|thanks?|bye|classes to each other|something about space|passion to each other why is it not happening)$/i;
const patterns:Array<{id:string;pattern:RegExp}>=[
 {id:"circuits",pattern:/\b(series|parallel|resistors? in (series|parallel)|circuit (branches?|connections?))\b/i},
 {id:"moon-tides",pattern:/\b(moon|lunar|tides?|tidal)\b/i},
 {id:"orbit-motion",pattern:/\b(orbital motion|orbit|barycent(?:er|re))\b/i},
 {id:"gravity-basics",pattern:/\b(gravity|gravitation|gravitational force|mass attraction)\b/i},
 {id:"photosynthesis",pattern:/\b(photosynthesis|chlorophyll|glucose)\b/i},
 {id:"electricity",pattern:/\b(ohm.s law|electricity|voltage|electric current|potential difference)\b/i},
 {id:"chemical-reactions",pattern:/\b(chemical equations?|reactants?|balancing equations?)\b/i},
 {id:"light",pattern:/\b(mirrors?|reflection|reflected light)\b/i},
 {id:"refraction",pattern:/\b(refraction|refractive|lenses?)\b/i}
];
export function isStudyQuestion(text:string){const t=text.trim();return /\?\s*$/.test(t)||/^(you\s+)?(why|how|what|when|where|could|can|will|would|is|are|do|does|tell me|explain|help me|i (want to|wonder))\b/i.test(t)||/\b(want to know|wondering why|curious about|would like to understand)\b/i.test(t)||/^(i (am|\x27m) (confused|not sure)|i (don\x27t|do not) understand|i would like to|please)/i.test(t);}
function matchTopic(text:string,selectedId:string):string|undefined{
 const explicit=patterns.find(item=>item.pattern.test(text)&&!!getConcept(item.id));
 if(explicit)return explicit.id;
 const selected=getConcept(selectedId);
 const lower=text.toLowerCase();
 if(selected&&(lower.includes(selected.title.toLowerCase())||(selected.keywords||[]).some(w=>w.length>=5&&lower.includes(w.toLowerCase()))))return selectedId;
 const fullTitle=allConcepts.find(c=>c.title.length>7&&lower.includes(c.title.toLowerCase()));
 return fullTitle?.id;
}
export function resolveConversationFocus(selectedId:string,studentTurns:string[]):ConversationFocus{
 const valid=studentTurns.filter(x=>typeof x==="string").map(x=>x.trim().slice(0,1200)).filter(Boolean).slice(-24);
 const meaningful=valid.filter(x=>x.length>=9&&!noise.test(x));
 const recent=meaningful.slice(-3),last=recent.at(-1)||"";
 const lastMatch=last?matchTopic(last,selectedId):undefined;
 let picked=lastMatch,confidence:"high"|"medium"|"low"=lastMatch?"high":"low";
 if(!picked&&recent.length>1){
  const candidate=matchTopic(recent.at(-2)!,selectedId);
  if(candidate&&/^(why|how|what|and |but |so |can |does |is |what about|tell me more|explain it)/i.test(last)){
   picked=candidate;confidence="medium";
  }
 }
 const id=picked&&getConcept(picked)?picked:getConcept(selectedId)?selectedId:"photosynthesis";
 let start=meaningful.length;
 for(let i=meaningful.length-1;i>=0;i--){
  const detected=matchTopic(meaningful[i],selectedId);
  if(detected&&detected!==id)break;
  start=i;
 }
 let relevant=meaningful.slice(start).filter(x=>{const detected=matchTopic(x,selectedId);return !detected||detected===id;}).slice(-12);
 if(!relevant.length&&picked&&last)relevant=[last];
 return {conceptId:id,confidence,reason:picked?"Recent student statements explicitly identify "+getConcept(id)?.title+".":"No reliable new-topic signal. Keeping the selected textbook concept.",relevantTurns:relevant,questions:relevant.filter(isStudyQuestion).slice(-5)};
}
export function focusConcept(input:{message:string;conceptId?:string;history?:Array<{role:string;text:string}>}):Concept|undefined{
 const student=[...(input.history||[]).filter(x=>x.role==="student").map(x=>x.text),input.message];
 return getConcept(resolveConversationFocus(input.conceptId||"photosynthesis",student).conceptId);
}
