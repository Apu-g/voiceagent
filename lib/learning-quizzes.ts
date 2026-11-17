import {allConcepts,getConcept,type Concept} from "./curriculum";
import {explorerFor,type LearningLane} from "./learning-lanes";
export type QuizLane=LearningLane;
export type QuizQuestion={id:string;prompt:string;options:string[];objective:string;explanation:string};
export type QuizPublicQuestion=Pick<QuizQuestion,"id"|"prompt"|"options">;
type KeyedQuestion=QuizQuestion&{answer:number};
const laneNames:Record<QuizLane,string>={logic:"Crack the Logic",course:"Ace Your Course",future:"Beyond the Classroom"};
export const quizLaneNames=laneNames;
const curated:Record<string,Partial<Record<QuizLane,Array<[string,string,string,string,string]>>>>={
 "moon-tides":{
  logic:[["What does the Moon's gravity attract?","Earth's oceans and solid rock","Only the ocean surface","Only objects near the equator","Gravity attracts mass throughout Earth."],["Why are there tidal bulges on both sides of Earth?","The Moon's pull differs across Earth's diameter","The Moon repels the far ocean","Earth has two separate moons","Differences in the Moon's gravitational pull across Earth produce tides."],["Does solid Earth experience tides?","Yes, rock also deforms slightly","No, gravity cannot affect rock","Only during solar eclipses","Solid Earth experiences smaller, measurable tidal deformation."]],
  course:[["Where is the Moon's pull slightly strongest?","On Earth's side nearer the Moon","On the far side of Earth","Equally everywhere on Earth","Lunar gravitational acceleration varies with distance."],["What explains the repeating rise and fall of sea level?","Tidal forces plus Earth's rotation and local geography","A daily change in the Moon's mass","The oceans becoming heavier at night","The rotation and varying gravitational forcing combine with local conditions."],["What else contributes significantly to tides?","The Sun's gravitational effect","Only wind from the Moon","Earth's magnetic field alone","The Sun also exerts differential gravity."]],
  future:[["A coastal engineer is planning a harbour. What data matters?","Local tide tables and coastal conditions","Only the daily temperature","The height of nearby mountains only","Safe harbour planning accounts for tidal ranges and local geography."],["Why should a fisher check the tide timetable?","Water depth and currents change with the tide","The Moon turns fish into water","Tides change the Earth's mass","Tide levels can affect access, depth and currents."],["Which career uses tidal predictions?","Oceanography and coastal engineering","Only music production","Only food chemistry","Ocean scientists and engineers use tidal observations and forecasts."]]
 },
 photosynthesis:{
  logic:[["Where does the carbon in a plant's glucose come from?","Carbon dioxide","Sunlight","Chlorophyll itself","Plants incorporate carbon from atmospheric carbon dioxide."],["What does sunlight provide during photosynthesis?","Energy to drive chemical reactions","Carbon atoms to build glucose","All the water a plant needs","Light provides energy, not the carbon atoms in sugars."],["What is the job of chlorophyll?","Absorb light energy","Digest soil minerals","Release nitrogen gas","Chlorophyll absorbs light." ]],
  course:[["Which pair is a raw material for photosynthesis?","Carbon dioxide and water","Oxygen and glucose","Chlorophyll and starch","Plants use carbon dioxide and water to make carbohydrates."],["Which gas is normally released in oxygenic photosynthesis?","Oxygen","Nitrogen","Methane","Water-derived oxygen is released."],["A plant is kept in darkness. Which input becomes unavailable?","Light energy","Carbon dioxide itself","Water molecules","Without light, the energy input needed for photosynthesis is absent."]],
  future:[["Two plants get different sunlight. What makes the test fair?","Keep water and soil similar","Change all conditions together","Give one plant no water","Change one main variable at a time."],["Which field applies photosynthesis to crop growth?","Agriculture","Astrology","Navigation alone","Crop science uses understanding of plant light and nutrient needs."],["A greenhouse designer wants to improve growth. What should they monitor?","Light and other growing conditions","Only the pot colour","Only the label on the seed packet","Plant growth depends on conditions including illumination, water and temperature."]]
 }
};
function rotateOptions(correct:string,distractors:string[],shift:number){const choices=[correct,...distractors.slice(0,2)];const turn=((shift%3)+3)%3;const options=choices.slice(turn).concat(choices.slice(0,turn));return {options,answer:options.indexOf(correct)}}
function comparable(concept:Concept){return allConcepts.filter(x=>x.id!==concept.id&&(x.subject||"Science")===(concept.subject||"Science")&&(x.grade||10)===(concept.grade||10)&&x.essentials.length).slice(0,18)}
function generated(concept:Concept,lane:QuizLane):KeyedQuestion[]{
 const others=comparable(concept),mission=explorerFor(concept.id);
 return [0,1,2].map(i=>{
  const unrelated=others.filter(x=>x.chapter!==concept.chapter);
  const distractors=unrelated.length>=2?unrelated:others;
  let prompt="",correct="",incorrect:string[],explanation="",objective="";
  if(lane==="logic"){
   objective=concept.essentials[i%concept.essentials.length]||concept.title;
   prompt="Which foundational idea belongs to "+concept.title+"?";
   correct=objective;incorrect=[distractors[(i*2)%distractors.length]?.essentials[0]||"Matter cannot change",distractors[(i*2+1)%distractors.length]?.essentials[0]||"Energy always disappears"];
   explanation="This lesson's foundation: "+objective+".";
  }else if(lane==="course"){
   objective=concept.essentials[i%concept.essentials.length]||concept.title;
   prompt="For "+concept.title+", which statement is a key course objective?";
   correct=objective;incorrect=[distractors[(i*2)%distractors.length]?.essentials.at(-1)||"Only light is involved",distractors[(i*2+1)%distractors.length]?.essentials.at(-1)||"The result is always zero"];
   explanation=concept.summary.slice(0,240);
  }else{
   objective=mission.title;prompt="Which real-world scenario best applies "+concept.title+"?";
   correct=mission.scenario;incorrect=[explorerFor(distractors[(i*2)%distractors.length]?.id||"photosynthesis").scenario,explorerFor(distractors[(i*2+1)%distractors.length]?.id||"electricity").scenario];
   explanation=mission.fact;
  }
  incorrect=incorrect.filter(x=>x!==correct);
  while(incorrect.length<2)incorrect.push("A separate idea from a different chapter "+(incorrect.length+1));
  const unique=[...new Set(incorrect)];while(unique.length<2)unique.push("Another unrelated concept "+unique.length);
  const chosen=rotateOptions(correct,unique,i+1);
  return {id:concept.id+"-"+lane+"-"+(i+1),prompt,objective,explanation,options:chosen.options,answer:chosen.answer};
 });
}
function fromCurated(concept:Concept,lane:QuizLane):KeyedQuestion[]|null{
 const bank=curated[concept.id]?.[lane];if(!bank)return null;
 return bank.map(([prompt,correct,wrong1,wrong2,explanation],i)=>{
  const selected=rotateOptions(correct,[wrong1,wrong2],i+1);
  return {id:concept.id+"-"+lane+"-"+(i+1),prompt,objective:concept.essentials[i%concept.essentials.length],explanation,options:selected.options,answer:selected.answer};
 });
}
export function quizFor(conceptId:string,lane:QuizLane,learningFocus=""):KeyedQuestion[]{
 const c=getConcept(conceptId);if(!c)throw Error("Unknown concept");
 const questions=fromCurated(c,lane)||generated(c,lane);
 const focus=learningFocus.trim().toLowerCase();
 if(!focus||focus.length>140)return questions;
 const relevant=questions.map(q=>({q,rank:q.objective.toLowerCase()===focus?2:q.objective.toLowerCase().includes(focus)?1:0}));
 return relevant.some(x=>x.rank)?relevant.sort((a,b)=>b.rank-a.rank).map(x=>x.q):questions;
}
export function publicQuiz(conceptId:string,lane:QuizLane,learningFocus=""):QuizPublicQuestion[]{
 return quizFor(conceptId,lane,learningFocus).map(({id,prompt,options})=>({id,prompt,options}));
}
export function gradeQuiz(conceptId:string,lane:QuizLane,answers:number[],learningFocus=""){
 const bank=quizFor(conceptId,lane,learningFocus);
 if(answers.length!==bank.length||answers.some((a,i)=>!Number.isInteger(a)||a<0||a>=bank[i].options.length))throw Error("Invalid quiz answers");
 const score=answers.reduce((n,a,i)=>n+(a===bank[i].answer?1:0),0);
 return {score,total:bank.length,passed:score>=Math.ceil(bank.length*2/3),points:score*100,results:bank.map((q,i)=>({questionId:q.id,correct:answers[i]===q.answer,correctIndex:q.answer,explanation:q.explanation,objective:q.objective}))};
}
