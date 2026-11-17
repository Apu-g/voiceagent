import test from "node:test";
import assert from "node:assert/strict";
import {analyzeAnswers,createRoadmap,validateAIReview} from "../lib/learning-engine.ts";
function pick(analysis,objective){return analysis.evidence.find(e=>e.objective===objective).status}
const cases=[
 ["correct photosynthesis energy", "photosynthesis",["Sunlight provides the energy for photosynthesis, and chlorophyll absorbs light."],"Sunlight supplies energy","correct"],
 ["chlorophyll explanation", "photosynthesis",["Chlorophyll is the pigment which absorbs light energy."],"Chlorophyll absorbs light","correct"],
 ["light directly becomes food misconception","photosynthesis",["The sunlight directly turns into glucose inside the leaves."],"Sunlight supplies energy","misconception"],
 ["incorrect carbon source","photosynthesis",["Sunlight provides the carbon atoms for glucose."],"Carbon dioxide supplies carbon","misconception"],
 ["carbon source correct","photosynthesis",["Carbon dioxide provides the carbon that becomes part of glucose."],"Carbon dioxide supplies carbon","correct"],
 ["questions do not prove mastery","photosynthesis",["How does photosynthesis work?"],"Chlorophyll absorbs light","unverified"],
 ["unclear very short answer","photosynthesis",["Maybe, yes."],"Sunlight supplies energy","unverified"],
 ["current not consumed","electricity",["Electric current is the rate of charge flow; voltage is the potential difference."],"Current is charge flow per time","correct"],
 ["current used up misconception","electricity",["Current is used up as it passes through a resistor."],"Current is charge flow per time","misconception"],
 ["incorrect Ohm law","electricity",["Ohm's law is V = I + R."],"Ohm's law relates V, I and R","misconception"],
 ["valid refraction explanation","refraction",["The light ray changes direction when it moves from air into water."],"Refraction occurs across media","correct"],
 ["unknown claims not marked wrong","heredity",["I enjoy my science teacher and drawing diagrams."],"Alleles are gene variants","unverified"],
 ["breathing misconception","respiration",["Breathing is respiration."],"Breathing differs from cellular respiration","misconception"],
 ["chemical conservation","chemical-reactions",["The atoms are conserved and the same total number appears on both sides."],"Atoms are conserved","correct"]
];
for(const [name,id,turns,objective,want] of cases){
 test(name,()=>{const analysis=analyzeAnswers(id,turns);assert.equal(pick(analysis,objective),want)});
}
test("misconception takes precedence over other evidence",()=>{
 const a=analyzeAnswers("photosynthesis",["Sunlight provides energy.","Sunlight turns directly into glucose."]);
 assert.equal(pick(a,"Sunlight supplies energy"),"misconception");
 assert.equal(a.recommendation,"foundation");
});
test("AI review rejects invented quotations",()=>{
 const a=analyzeAnswers("photosynthesis",["The green pigment is important to the plant."]);
 const b=validateAIReview(a,[{objective:"Chlorophyll absorbs light",status:"correct",quote:"Chlorophyll absorbs sunlight"}],["The green pigment is important to the plant."]);
 assert.equal(pick(b,"Chlorophyll absorbs light"),"unverified");
});
test("AI review requires semantic support, not just a verbatim vague quotation",()=>{
 const turns=["This plant makes molecules by taking its material out of the air."];
 const a=analyzeAnswers("photosynthesis",turns);
 const b=validateAIReview(a,[{objective:"Carbon dioxide supplies carbon",status:"correct",quote:"taking its material out of the air"}],turns);
 assert.equal(pick(b,"Carbon dioxide supplies carbon"),"unverified");
});
test("AI can clarify strong quoted paraphrase that rules did not cover",()=>{
 const turns=["Solar photons fuel the reactions in a leaf."];
 const a=analyzeAnswers("photosynthesis",turns);
 const b=validateAIReview(a,[{objective:"Sunlight supplies energy",status:"correct",quote:"Solar photons fuel the reactions"}],turns);
 assert.equal(pick(b,"Sunlight supplies energy"),"correct");
});
test("roadmap always has unique valid lessons and a first action",()=>{
 for(const id of ["photosynthesis","electricity","respiration","chemical-reactions","heredity","refraction","magnetism"]){
  for(const input of [[],["I don't know."],["Sunlight provides energy to plants and chlorophyll absorbs light."]]){
   const plan=createRoadmap(analyzeAnswers(id,input),new Date("2026-11-17T00:00:00Z"));
   assert.ok(plan.lessons.length>=1&&plan.lessons.length<=5);
   assert.equal(new Set(plan.lessons.map(l=>l.conceptId)).size,plan.lessons.length);
   assert.equal(plan.lessons[0].status,"start");
   assert.ok(plan.lessons.every(l=>l.title&&l.description&&l.objective));
   assert.equal(plan.generatedAt,"2026-11-17T00:00:00.000Z");
  }
 }
});
test("no transcript cannot be reported as confident mastery",()=>{
 const a=analyzeAnswers("photosynthesis",[]);
 assert.equal(a.confidence,"low");assert.equal(a.recommendation,"foundation");assert.ok(a.evidence.every(e=>e.status==="unverified"));
});
test("roadmap starts from prerequisite on foundational gaps",()=>{
 const p=createRoadmap(analyzeAnswers("photosynthesis",["I don't know what photosynthesis means."]));
 assert.equal(p.lessons[0].conceptId,"life-nutrition");assert.equal(p.lessons[1].conceptId,"photosynthesis");
});
test("roadmap chooses practice or application from correct evidence",()=>{
 const p=createRoadmap(analyzeAnswers("electricity",["Current is the flow of electric charge per unit time. Voltage is potential difference. Resistance opposes current. Ohm's law says V = I * R."]));
 assert.equal(p.lessons[0].conceptId,"electricity");
 assert.equal(p.analysis.recommendation,"challenge");
});

test("negation of carbon dioxide need is not a correct answer",()=>{const a=analyzeAnswers("photosynthesis",["Sunlight directly turns into glucose, so plants do not need carbon dioxide."]);assert.equal(pick(a,"Carbon dioxide supplies carbon"),"misconception");assert.equal(a.recommendation,"foundation")});
test("negated chlorophyll statement is treated as a misconception",()=>{const a=analyzeAnswers("photosynthesis",["Chlorophyll does not absorb light."]);assert.equal(pick(a,"Chlorophyll absorbs light"),"misconception")});
test("denied claim is never counted as supported evidence",()=>{const a=analyzeAnswers("photosynthesis",["Sunlight does not supply energy for photosynthesis."]);assert.notEqual(pick(a,"Sunlight supplies energy"),"correct")});

test("AI cannot promote vague sunlight-air-water co-occurrence into demonstrated understanding",()=>{const turns=["The sunlight and air and water all work together in a complex transformation."];const a=analyzeAnswers("photosynthesis",turns);const b=validateAIReview(a,[{objective:"Sunlight supplies energy",status:"correct",quote:turns[0]}],turns);assert.equal(pick(b,"Sunlight supplies energy"),"unverified")});

test("student self-correction is kept uncertain, not permanently wrong",()=>{
 const analysis=analyzeAnswers("photosynthesis",[
 "Sunlight directly turns into glucose.",
 "I need to correct that. Sunlight provides energy, while carbon dioxide supplies the carbon for glucose."
 ]);
 assert.equal(pick(analysis,"Sunlight supplies energy"),"unverified");
 assert.equal(analysis.recommendation,"practice");
});
test("later misconception still triggers foundation review",()=>{
 const analysis=analyzeAnswers("photosynthesis",[
 "Sunlight provides energy.",
 "Actually sunlight directly turns into glucose."
 ]);
 assert.equal(pick(analysis,"Sunlight supplies energy"),"misconception");
});
