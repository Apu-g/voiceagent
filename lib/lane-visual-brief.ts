import type {Concept} from "./curriculum";
import type {ExplorerMission,LearningLane} from "./learning-lanes";
export type LaneVisualBrief={conceptId:string;lane:LearningLane;title:string;objective:string;scenario:string;nodes:Array<{label:string;detail:string}>;edges:string[];scenePrompt:string;source:"deterministic-approved-curriculum"};
export function buildLaneVisualBrief(concept:Concept,lane:LearningLane,objective:string,mission:ExplorerMission):LaneVisualBrief{
 const nodes=lane==="logic"?
  [{label:"START",detail:concept.title},{label:"WHY",detail:objective},{label:"CHECK",detail:concept.misconception.replace(/^A common confusion is this:/i,"").slice(0,105)}]:
  lane==="course"?
  [{label:"QUESTION",detail:concept.question},{label:"IDEA",detail:objective},{label:"APPLY",detail:concept.essentials[1]||concept.summary.slice(0,100)}]:
  [{label:"REAL WORLD",detail:mission.scenario},{label:"YOUR MISSION",detail:mission.challenge},{label:"POSSIBILITIES",detail:mission.fields.join(" · ")}];
 const scenePrompt=`Create one original, age-appropriate educational diagram for a Class ${concept.grade||10} ${concept.subject||"Science"} student. Topic: ${concept.title}. Learning mode: ${lane}. Key objective: ${objective}. Real life context: ${mission.scenario}. Accurate labels, legible arrows, high contrast, simple science illustration. Show only scientifically supported relationships, no fictional characters, no borrowed anime art, no brand marks.`;
 return {conceptId:concept.id,lane,title:concept.title+" — "+(lane==="logic"?"Understand":lane==="course"?"Practice":"Apply"),objective,scenario:mission.scenario,nodes,edges:["Understand","Connect"],scenePrompt,source:"deterministic-approved-curriculum"};
}
