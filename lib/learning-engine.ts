import { allConcepts, getConcept } from "./curriculum";
import {isStudyQuestion} from "./conversation-focus";

export type EvidenceStatus = "correct" | "misconception" | "unverified";
export type LearningEvidence = { objective: string; status: EvidenceStatus; quote?: string; note: string; source: "rule" | "ai-reviewed" };
export type Analysis = { conceptId: string; conceptTitle: string; evidence: LearningEvidence[]; confidence: "low" | "medium"; recommendation: "foundation" | "practice" | "challenge"; rationale: string; studentTurns: number; analysisMethod: string; needsReview: boolean };
export type Lesson = { id: string; conceptId: string; title: string; chapter: string; description: string; objective: string; status: "start" | "next" | "later"; minutes: number; activity: "explain" | "practice" | "apply" };
export type Roadmap = { analysis: Analysis; lessons: Lesson[]; generatedAt: string };

type Rule = { objective: string; patterns: RegExp[]; misconception?: RegExp[]; tip: string };
const ruleSets: Record<string, Rule[]> = {
 circuits:[
  {objective:"Series current",patterns:[/\b(series|one path).{0,55}(same current|current is the same|equal current|single current)/i,/\bsame current.{0,45}series/i],misconception:[/series.{0,40}(current splits|different current|voltage same across)/i],tip:"In a series circuit the same current passes through all components."},
  {objective:"Parallel voltage",patterns:[/\b(parallel|branches).{0,55}(same voltage|same potential difference|equal voltage)/i,/\bsame (voltage|potential difference).{0,45}parallel/i],misconception:[/parallel.{0,45}(voltage splits|different voltage|current same in all)/i],tip:"The voltage across each parallel branch is equal."},
  {objective:"Equivalent resistance",patterns:[/\b(series).{0,60}(resistances? add|sum of resistance|total resistance)/i,/parallel.{0,60}(reciprocal|resistance decreases|lower equivalent)/i],misconception:[/parallel.{0,40}(just add|sum all resistance)/i],tip:"Series resistances add; parallel resistance uses the sum of reciprocals."}
 ],
"moon-tides":[
  {objective:"The Moon attracts all of Earth",patterns:[/(moon|lunar).{0,50}(pull|attract).{0,60}(earth|rock|land|ocean)/i,/(earth|land|rock|ocean).{0,45}(pull|attract).{0,35}moon/i],misconception:[/moon.{0,45}(only|just).{0,25}(pull|attract).{0,25}(water|ocean)/i],tip:"Lunar gravity acts on Earth's solid body and water alike."},
  {objective:"Tides come from differences in gravity across Earth",patterns:[/(gravity|pull).{0,70}(stronger|weaker|different|variation|near side|far side)/i,/tidal (force|difference|bulge)/i],misconception:[/moon.{0,40}(repel|pushes away)/i],tip:"The Moon's gravity varies slightly across Earth; that difference produces tides."},
  {objective:"Earth and Moon orbit a common centre of mass",patterns:[/(earth|moon).{0,60}(barycent|center of mass|centre of mass|shared centre|shared center)/i,/(both|earth and moon).{0,45}orbit/i],tip:"Earth and Moon move around their shared centre of mass."}
 ],
 photosynthesis: [
  {objective:"Sunlight supplies energy",patterns:[/sunlight.{0,60}(energy|power|driv)/i,/light.{0,45}(energy|absorb|power)/i],misconception:[/(sunlight|light).{0,30}(becomes|turns (directly )?into|is converted (directly )?to).{0,25}(glucose|sugar|food)/i,/(sunlight|light).{0,25}(does not|doesn.t|never|cannot).{0,25}(provide|supply|give|energy)/i],tip:"Light supplies energy; it is not itself the carbon-containing sugar."},
  {objective:"Carbon dioxide supplies carbon",patterns:[/(carbon dioxide|co2|co₂).{0,28}(provides|supplies|gives|contains|source of).{0,30}carbon/i,/(glucose|sugar).{0,30}(carbon from|carbon atoms from).{0,25}(carbon dioxide|co2|co₂)/i],misconception:[/(oxygen|sunlight|water).{0,25}(provides|supplies|is).{0,25}(carbon atoms|carbon for glucose)/i,/(do not need|don.t need|doesn.t need|not need|without|no need for).{0,25}(carbon dioxide|co2|co₂)/i,/(carbon dioxide|co2|co₂).{0,20}(not needed|unnecessary|doesn.t matter)/i],tip:"Carbon dioxide provides carbon atoms that ultimately form carbohydrates."},
  {objective:"Water is used and oxygen released",patterns:[/water.{0,55}(oxygen|release|split|used)/i,/(oxygen|o2).{0,55}(release|from water)/i],misconception:[/plants.{0,30}(use|take in).{0,15}oxygen.{0,30}(make|produce).{0,12}(sugar|glucose)/i],tip:"Water contributes to photosynthesis; oxygen gas is released."},
  {objective:"Chlorophyll absorbs light",patterns:[/chlorophyll.{0,40}(absorb|capture|trap|light|sunlight)/i],misconception:[/chlorophyll.{0,20}(is|becomes).{0,10}(glucose|sugar)/i,/chlorophyll.{0,20}(does not|doesn.t|cannot|never).{0,15}(absorb|capture)/i],tip:"Chlorophyll is a pigment that absorbs light energy."}
 ],
 electricity: [
  {objective:"Current is charge flow per time",patterns:[/current.{0,50}(flow|charge|rate|electron)/i,/(charge|electron).{0,45}flow/i],misconception:[/current.{0,30}(used up|consumed|disappear)/i],tip:"Electric current measures charge flow per second."},
  {objective:"Voltage is potential difference",patterns:[/voltage.{0,50}(potential|difference|push|drive)/i,/potential difference/i],tip:"Voltage is energy transferred per unit charge."},
  {objective:"Resistance opposes current",patterns:[/resistance.{0,45}(oppos|restrict|limit|current|flow)/i],tip:"Resistance opposes the flow of charge."},
  {objective:"Ohm's law relates V, I and R",patterns:[/v\s*=\s*i\s*\*?\s*r/i,/ohm.s law/i,/voltage.{0,40}current.{0,25}resistance/i],misconception:[/v\s*=\s*i\s*\+\s*r/i],tip:"Under suitable conditions, V = I × R."}
 ],
 respiration: [
  {objective:"Respiration releases usable energy",patterns:[/(respiration|cell).{0,55}(energy|atp|glucose)/i,/(glucose|food).{0,40}(energy|break)/i],tip:"Cells release usable energy by breaking down food."},
  {objective:"Aerobic respiration uses oxygen",patterns:[/(aerobic|respiration).{0,40}oxygen/i,/oxygen.{0,30}aerobic/i],tip:"Aerobic respiration uses oxygen."},
  {objective:"Breathing differs from cellular respiration",patterns:[/breathing.{0,45}(different|not same|gas exchange)/i,/cellular respiration.{0,45}(cell|chemical)/i],misconception:[/breathing (is|means) respiration/i],tip:"Breathing exchanges gases; cellular respiration is a chemical process in cells."}
 ],
 "chemical-reactions": [
  {objective:"Reactants form new products",patterns:[/reactant.{0,60}product/i,/product.{0,55}reactant/i],tip:"Reactants rearrange into new products."},
  {objective:"Atoms are conserved",patterns:[/atom.{0,40}(conserv|same|equal)/i,/conservation of mass/i],misconception:[/atoms? (are|is) (created|destroyed)/i],tip:"Atoms are conserved during ordinary chemical reactions."},
  {objective:"Balance coefficients, not subscripts",patterns:[/coefficient.{0,50}(balance|equation|change)/i,/same number.{0,30}atoms/i],misconception:[/change.{0,25}subscript.{0,25}balanc/i],tip:"Adjust coefficients when balancing equations."}
 ],
 refraction: [
  {objective:"Refraction occurs across media",patterns:[/(light|ray).{0,50}(medium|media|water|glass)/i],tip:"Refraction concerns light crossing between materials."},
  {objective:"Speed changes can bend light",patterns:[/(light|ray).{0,55}(bend|direction|speed)/i],tip:"The light's speed and possibly its direction change at the boundary."},
  {objective:"No bending when incident along normal",patterns:[/(normal|perpendicular).{0,45}(not bend|straight|no deviation)/i],misconception:[/always bends?/i],tip:"Light entering along the normal does not deviate."}
 ],
 heredity: [
  {objective:"Traits are inherited via genes",patterns:[/(genes?|dna).{0,55}(trait|inherit|parent)/i,/(traits?|inherit).{0,55}(genes?|dna)/i],tip:"Genes contribute to inherited traits."},
  {objective:"Alleles are gene variants",patterns:[/alleles?.{0,50}(variant|form|version|gene)/i],tip:"Alleles are different versions of a gene."},
  {objective:"Dominant does not mean more common",patterns:[/dominant.{0,50}(not|doesn.t).{0,20}(common|better)/i],misconception:[/dominant.{0,25}(always|more).{0,20}(common|better)/i],tip:"Dominance does not imply frequency or superiority."}
 ]
};
function quoteFor(text:string,regex:RegExp):string|undefined {const m=regex.exec(text);if(!m)return;const start=Math.max(0,m.index-35);return text.slice(start,Math.min(text.length,m.index+m[0].length+35)).trim().slice(0,185);}
function cleanStudentTurns(turns:string[]):string[]{return turns.filter(x=>typeof x==="string").map(x=>x.trim().slice(0,1500)).filter(Boolean).slice(-12);}
function isQuestionOnly(text:string){return isStudyQuestion(text)||/^(please explain|teach me|quiz me|i want to know)\b/i.test(text.trim());}
export function analyzeAnswers(conceptId:string,studentTurns:string[]):Analysis{
 const concept=getConcept(conceptId)||allConcepts[0];
 const answers=cleanStudentTurns(studentTurns).filter(x=>!isQuestionOnly(x));
 const rules=ruleSets[concept.id]||concept.essentials.map((objective)=>({objective,patterns:[] as RegExp[],tip:"Ask a direct diagnostic question to verify this objective."}));
 const evidence:LearningEvidence[]=rules.map(rule=>{
  type Observation={status:"correct"|"misconception";quote?:string};
  const observations:Observation[]=[];
  for(const utterance of answers){
   const sentences=utterance.split(/[.!?;]+/).map(x=>x.trim()).filter(Boolean);
   for(const sentence of sentences){
    const wrong=(rule.misconception||[]).find(p=>p.test(sentence));
    if(wrong){observations.push({status:"misconception",quote:quoteFor(sentence,wrong)});continue;}
    const positive=rule.patterns.find(p=>{const q=quoteFor(sentence,p);return q!==undefined&&!/\b(not|never|without|don.t|doesn.t|isn.t|cannot|can.t|no)\b/i.test(q)});
    if(positive)observations.push({status:"correct",quote:quoteFor(sentence,positive)});
   }
  }
  const latest=observations.at(-1);
  if(latest?.status==="misconception")return {objective:rule.objective,status:"misconception",quote:latest.quote,note:rule.tip,source:"rule"};
  if(latest?.status==="correct"){
   if(observations.some(x=>x.status==="misconception"))return {objective:rule.objective,status:"unverified",quote:latest.quote,note:"Student corrected an earlier misconception. Ask a fresh application question before treating this as demonstrated knowledge.",source:"rule"};
   return {objective:rule.objective,status:"correct",quote:latest.quote,note:"The explanation contains a relevant claim. A new question should still verify transfer.",source:"rule"};
  }
  return {objective:rule.objective,status:"unverified",note:"No reliable supporting evidence detected. Do not treat silence as an error.",source:"rule"};
 });
 const correct=evidence.filter(e=>e.status==="correct").length,wrong=evidence.filter(e=>e.status==="misconception").length;
 const recommendation=wrong>0||correct===0?"foundation":correct<evidence.length?"practice":"challenge";
 const confidence=answers.length>=2&&correct>0?"medium":"low";
 const needsReview=answers.some(t=>t.split(/\s+/).length>=9)&&evidence.every(e=>e.status==="unverified");
 return {conceptId:concept.id,conceptTitle:concept.title,evidence,confidence,recommendation,rationale:wrong>0?"A possible misconception needs direct clarification before moving forward.":correct===0?"Insufficient evidence yet. Start with a diagnostic lesson.":correct<evidence.length?"Some ideas appeared; verify the remaining objectives with targeted practice.":"Core ideas appeared in the explanation; test with a new application before advancing.",studentTurns:answers.length,analysisMethod:"deterministic rules v1",needsReview};
}
const lessonMap:Record<string,string[]>={
 circuits:["circuits","electricity"],
 "moon-tides":["moon-tides","gravity-basics","orbit-motion"],
 "gravity-basics":["gravity-basics","moon-tides","orbit-motion"],
 "orbit-motion":["orbit-motion","gravity-basics","moon-tides"],
 photosynthesis:["life-nutrition","photosynthesis","respiration","transport"],
 electricity:["electricity","circuits","magnetism"],
 respiration:["life-nutrition","respiration","transport"],
 refraction:["light","refraction","eye"],
 heredity:["reproduction","heredity"],
 "chemical-reactions":["chemical-reactions","oxidation","acids-bases"],
 carbon:["carbon","reproduction"],
 "acids-bases":["acids-bases","salts","metals"]
};
// Verified chapter-preparation sequence for the original Class 10 Maths mini-lessons.
const maths10Prerequisites:Record<number,number[]>={
 1:[],2:[1],3:[2],4:[2],5:[3],6:[],7:[6],8:[6],9:[8],10:[6],11:[10],12:[11],13:[],14:[13]
};
export function createRoadmap(analysis:Analysis,now=new Date()):Roadmap{
 const focalConcept=getConcept(analysis.conceptId);
 const isMaths10=analysis.conceptId.startsWith("maths-10-preview-");
 const number=isMaths10?Number(analysis.conceptId.slice("maths-10-preview-".length)):0;
 const nextMath=isMaths10&&number<14?["maths-10-preview-"+(number+1)]:[];
 const mathItems=isMaths10?[
   ...(analysis.recommendation==="foundation"?(maths10Prerequisites[number]||[]).slice(-1).map(n=>"maths-10-preview-"+n):[]),
   analysis.conceptId,...nextMath
 ]:[];
 const relatedTopics=allConcepts.filter(c=>c.id!==analysis.conceptId&&(c.grade??10)===(focalConcept?.grade??10)&&(c.subject??"Science")===(focalConcept?.subject??"Science"));
 const sameChapter=relatedTopics.filter(c=>c.chapter===focalConcept?.chapter);
 const nextBookChapters=focalConcept?.id.startsWith("science-9-")?relatedTopics.filter(c=>c.id.startsWith("science-9-")).slice(0,2):[];
 const ids=isMaths10?mathItems:lessonMap[analysis.conceptId]||[analysis.conceptId,...(sameChapter.length?sameChapter:nextBookChapters).slice(0,2).map(c=>c.id)];
 const focal=analysis.conceptId;const sequence=isMaths10?ids:analysis.recommendation==="foundation"&&!!lessonMap[focal]&&!["moon-tides","gravity-basics","orbit-motion","circuits"].includes(focal) ? [...ids.filter(id=>id!==focal).slice(0,1),focal,...ids.filter(id=>id!==focal).slice(1)] : [focal,...ids.filter(id=>id!==focal)];
 const unique=[...new Set(sequence)].slice(0,5);
 const lessons:Lesson[]=unique.map((id,i)=>{
  const c=getConcept(id)!;const obj=c.essentials[0]||c.title;
  return {id:`lesson-${i+1}-${id}`,conceptId:id,title:c.title,chapter:c.chapter,description:i===0&&analysis.recommendation==="foundation"?"Start with a simpler foundation and build confidence.":c.summary,objective:obj,status:i===0?"start":i===1?"next":"later",minutes:i===0?7:10,activity:analysis.recommendation==="challenge"&&i===0?"apply":i===0?"explain":"practice"};
 });
 return {analysis,lessons,generatedAt:now.toISOString()};
}
// AI suggestions are never enough on their own. Require an explicit semantic anchor
// before upgrading "unverified"; absence or vague co-occurrence remains unverified.
const reviewerAnchors:Record<string,RegExp[]>={
 "Sunlight supplies energy":[/\b(sunlight|sun|solar|light|photons?)\b/i,/\b(energy|power|powers|fuel|fuels|fueled|drives|driving)\b/i],
 "Carbon dioxide supplies carbon":[/(carbon dioxide|co2|co₂)/i,/\b(carbon|glucose|sugar)\b/i,/\b(source|provide|provides|supply|supplies|become|becomes|build|builds|form|forms)\b/i],
 "Water is used and oxygen released":[/\bwater\b/i,/\boxygen\b/i,/\b(release|released|produce|produced|split|splits)\b/i],
 "Chlorophyll absorbs light":[/\bchlorophyll\b/i,/\b(sunlight|light|photons?)\b/i,/\b(absorb|absorbs|capture|captures|trap|traps)\b/i]
};

export function validateAIReview(analysis:Analysis,review:{objective:string;status:EvidenceStatus;quote:string}[],studentTurns:string[]):Analysis{
 const analysisInputs=cleanStudentTurns(studentTurns);
 const revised=analysis.evidence.map(e=>{
  if(e.status!=="unverified")return e;const candidate=review.find(r=>r.objective===e.objective);
  if(!candidate||!["correct","misconception"].includes(candidate.status)||typeof candidate.quote!=="string")return e;
  // AI must quote exactly from the student's explanation and cannot override established rules.
  if(!candidate.quote.trim()||!analysisInputs.some(s=>s.toLowerCase().includes(candidate.quote.trim().toLowerCase())))return e;
  const quote=candidate.quote.trim();
  if(candidate.status==="misconception")return {...e,quote:quote.slice(0,185),note:"AI suggests a possible misconception. Ask a targeted question to verify; this is not an established error.",source:"ai-reviewed" as const};
  const anchors=reviewerAnchors[e.objective];
  if(!anchors||!anchors.every(p=>p.test(quote))||/\b(not|never|without|doesn.t|don.t|cannot|no)\b/i.test(quote))return e;
  return {...e,status:"correct" as const,quote:quote.slice(0,185),note:"AI found an explicit, independently checkable idea. This remains provisional until the student answers a new question.",source:"ai-reviewed" as const};
 });
 const good=revised.filter(e=>e.status==="correct").length,bad=revised.filter(e=>e.status==="misconception").length;
 return {...analysis,evidence:revised,recommendation:bad>0||good===0?"foundation":good<revised.length?"practice":"challenge",analysisMethod:"rules + AI reviewed evidence",needsReview:false};
}
