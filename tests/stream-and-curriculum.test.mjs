import test from "node:test";
import assert from "node:assert/strict";
import {eventFrame,parseSSE} from "../lib/sse.ts";
import {makeLearningVisual} from "../lib/visuals.ts";
import {getConcept,allConcepts} from "../lib/curriculum.ts";
import {analyzeAnswers,createRoadmap} from "../lib/learning-engine.ts";
test("SSE parses provider tokens across arbitrary byte boundaries",()=>{
 const input=eventFrame("metadata",{kind:"pdf"})+eventFrame("token",{text:"Hello "})+eventFrame("token",{text:"student."})+eventFrame("done",{provider:"groq"});
 const seen=[];let left="";
 for(let i=0;i<input.length;i+=3)left=parseSSE(left+input.slice(i,i+3),e=>seen.push(e));
 assert.equal(left,"");
 assert.deepEqual(seen.map(e=>e.event),["metadata","token","token","done"]);
 assert.equal(seen[1].data.text+seen[2].data.text,"Hello student.");
});
test("SSE parser tolerates incomplete frames without duplicate events",()=>{
 const seen=[];let left=parseSSE("event: token\ndata: {\"text\":\"Hello",x=>seen.push(x));
 assert.equal(seen.length,0);
 left=parseSSE(left+" world\"}\n\n",x=>seen.push(x));
 assert.equal(seen.length,1);assert.equal(left,"");assert.equal(seen[0].data.text,"Hello world");
});
test("Learning visual is structured and sourced",()=>{
 const selected=getConcept("photosynthesis");const result=makeLearningVisual(selected.id,selected.title,selected.essentials);
 assert.equal(result.nodes.length,4);
 assert.equal(result.source,"teacher-reviewed-template");
 assert.match(result.caption,/carbon dioxide/i);
 assert.ok(!/sunlight (turns|converts) into glucose/i.test(result.caption));
});
test("Unknown topic visual is a clearly marked overview",()=>{
 const result=makeLearningVisual("science-9-1","Matter in Our Surroundings",["Particles are moving","Diffusion"]);
 assert.equal(result.source,"overview-template");
 assert.ok(result.nodes.length>=2);
});
test("Class 9 books are selectable independently of Class 10",()=>{
 const g9=allConcepts.filter(c=>(c.grade??10)===9&&(c.subject??"Science")==="Science");
 assert.ok(g9.length>=10);assert.ok(g9.some(c=>c.chapter==="Matter in Our Surroundings"));
 const g10=allConcepts.filter(c=>(c.grade??10)===10&&(c.subject??"Science")==="Science");
 assert.ok(g10.some(c=>c.id==="photosynthesis"));
});
test("Class 9 roadmap stays in the selected subject and grade",()=>{
 const analysis=analyzeAnswers("science-9-1",["I am not sure yet."]);
 const plan=createRoadmap(analysis);
 assert.ok(plan.lessons.length>=2);
 assert.ok(plan.lessons.every(x=>getConcept(x.conceptId)?.grade===9));
 assert.ok(plan.lessons.every(x=>getConcept(x.conceptId)?.subject==="Science"));
});
test("Class 10 Maths preview is explicitly marked",()=>{
 const entries=allConcepts.filter(x=>x.subject==="Mathematics"&&x.grade===10);
 assert.ok(entries.length>=10);assert.ok(entries.every(x=>x.previewOnly));
});
