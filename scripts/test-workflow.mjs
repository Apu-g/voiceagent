// Integration test: run "npm run dev" in a separate terminal, then npm run test:workflow.
import assert from "node:assert/strict";
const base=(process.env.EXPLAINO_BASE_URL||"http://localhost:3000").replace(/\/$/,"");
async function json(path,payload){
 const resp=await fetch(base+path,{method:payload?"POST":"GET",headers:{"Content-Type":"application/json"},body:payload?JSON.stringify(payload):undefined});
 const data=await resp.json();assert.equal(resp.status,200,JSON.stringify({path,status:resp.status,error:data.error}));return data;
}
const catalog=await json("/api/catalog");
assert.ok(catalog.concepts.length>=20);
const lesson=await json("/api/lesson?conceptId=photosynthesis");
assert.equal(lesson.steps.length,4);
if(!process.argv.includes("--with-ai")){
const textbook=await json("/api/textbooks?q=photosynthesis&grade=10&subject=Science");
assert.ok(textbook.results.some(x=>x.bookId==="science-10"&&x.page>0),"Expected OCR-indexed Class 10 Science passages");
console.log("PASS OCR-indexed Class 10 Science sources",textbook.results.length);
const lesson9=await json("/api/lesson?conceptId=science-9-1");
assert.equal(lesson9.sourceStatus,"textbook-grounded");
assert.ok(lesson9.citations.length>0);
console.log("PASS Class 9 textbook-grounded lesson with source pages");
const preview10=await json("/api/lesson?conceptId=maths-10-preview-1");
assert.equal(preview10.sourceStatus,"original-notes-official-reference");
console.log("PASS Mathematics contents-only warning");
assert.ok(preview10.workedExample?.working?.length>=2);
assert.ok(preview10.resource?.url.endsWith("/jemh101.pdf"));
const quadratic=await json("/api/lesson?conceptId=maths-10-preview-4");
assert.match(quadratic.concept.summary,/quadratic/i);
assert.equal(quadratic.workedExample.answer,"x = 2 or x = 3.");
assert.equal(quadratic.resource.url,"https://ncert.nic.in/textbook/pdf/jemh104.pdf");
console.log("PASS Grade 10 Maths original lessons and official chapter references");
const mathSearch=await json("/api/textbooks?q=quadratic%20equations&grade=10&subject=Mathematics");
assert.deepEqual(mathSearch.results,[],"A contents-page preview must not be treated as source evidence");
console.log("PASS No fake retrieval from the incomplete mathematics PDF");
const mathRoadmap=await json("/api/roadmap",{conceptId:"maths-10-preview-4",turns:[]});
assert.deepEqual(mathRoadmap.lessons.slice(0,2).map(x=>x.conceptId),["maths-10-preview-2","maths-10-preview-4"]);
console.log("PASS Grade 10 Maths prerequisite learning roadmap");
const diagram=await json("/api/visual?conceptId=photosynthesis");
assert.equal(diagram.nodes.length,4);
console.log("PASS deterministic visual explanation");

const scenarios=[
{name:"Correct explanation",text:["Chlorophyll absorbs sunlight, and sunlight provides energy. Carbon dioxide supplies the carbon that forms glucose."],expected:"practice"},
{name:"Scientific misconception",text:["Sunlight directly turns into glucose, and plants do not need carbon dioxide."],expected:"foundation"},
{name:"No explanation",text:[],expected:"foundation"},
{name:"Question instead of an explanation",text:["What is photosynthesis?"],expected:"foundation"}
];
for(const sample of scenarios){
 const result=await json("/api/roadmap",{conceptId:"photosynthesis",turns:sample.text});
 assert.equal(result.analysis.recommendation,sample.expected,sample.name);
 assert.ok(result.lessons.length>0);
 assert.equal(result.lessons[0].status,"start");
 assert.equal(new Set(result.lessons.map(x=>x.conceptId)).size,result.lessons.length);
 assert.ok(result.analysis.evidence.every(e=>e.source&&e.note&&e.objective));
 console.log("PASS",sample.name,"→",result.analysis.recommendation,",",result.lessons.length,"lessons");
}
const quick=await json("/api/chat",{message:"I have a question",conceptId:"photosynthesis",history:[]});
assert.equal(quick.provider,"mentor-rules");
console.log("PASS fast mentor greeting with no model call");
}
if(process.argv.includes("--with-ai")){
 const ambiguous=await json("/api/roadmap",{conceptId:"photosynthesis",turns:["The sunlight and air and water all work together in a complex transformation, and the part that helps the cell is called the important bit."]});
 console.log("OPTIONAL AI REVIEW:",ambiguous.reviewProvider,"/",ambiguous.analysis.recommendation);
 assert.equal(ambiguous.analysis.evidence.find(x=>x.objective==="Sunlight supplies energy").status,"unverified");
}
// Token-streaming route works for rule-based answers without any provider spend.
const streamResponse=await fetch(base+"/api/chat/stream",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:"I have a question",conceptId:"photosynthesis",history:[]})});
assert.equal(streamResponse.status,200);
const streamed=await streamResponse.text();
assert.match(streamed,/event: metadata/);
assert.match(streamed,/event: token/);
assert.match(streamed,/event: done/);
console.log("PASS streaming response events");
console.log("All workflow checks passed.");
