#!/usr/bin/env node
// Exercises ACTUAL Next.js HTTP routes, including every topic and learning lane.
// Run: node --import tsx scripts/smoke-quiz-video-apis.mjs --base http://localhost:3000 --writes
import {randomUUID} from "node:crypto";
import {allConcepts} from "../lib/curriculum.ts";
import {quizFor} from "../lib/learning-quizzes.ts";
const base=(process.argv.includes("--base")?process.argv[process.argv.indexOf("--base")+1]:"http://localhost:3000").replace(/\/$/,"");
const writes=process.argv.includes("--writes");
const lanes=["logic","course","future"];
const errors=[];
let quizCount=0,videoCount=0,writeCount=0;
async function request(path,options){
 const response=await fetch(base+path,{...options,signal:AbortSignal.timeout(11000)});
 const body=await response.json();
 if(!response.ok)throw Error(response.status+" "+path+" "+JSON.stringify(body).slice(0,220));
 return body;
}
async function checkQuiz(concept,lane){
 const path="/api/learning-quiz?conceptId="+encodeURIComponent(concept.id)+"&lane="+lane;
 const data=await request(path);
 if(data.conceptId!==concept.id||data.lane!==lane||data.questions?.length!==3)
  throw Error("Question contract mismatch "+concept.id+"/"+lane);
 for(const q of data.questions){
  if(!q.id||!q.prompt||q.options.length!==3||"answer" in q||"correctIndex" in q||"explanation" in q)
   throw Error("Quiz answer key leaked / invalid "+concept.id+"/"+lane);
 }
 quizCount++;
}
async function checkVideos(concept){
 const data=await request("/api/videos?conceptId="+encodeURIComponent(concept.id));
 if(!data.searchUrl?.startsWith("https://www.youtube.com/results?"))throw Error("Missing search fallback "+concept.id);
 if(!["ready","unavailable"].includes(data.status)||!Array.isArray(data.videos))throw Error("Invalid video response "+concept.id);
 if(data.videos.some(v=>!/^[A-Za-z0-9_-]{11}$/.test(v.id)||!v.embedUrl.startsWith("https://www.youtube.com/embed/")||!v.watchUrl.startsWith("https://www.youtube.com/watch?v=")))
  throw Error("Unsafe or legacy video embed "+concept.id);
 if(data.status!=="ready"||!data.videos.length)throw Error("No prefetched videos for "+concept.id);
 videoCount++;
}
async function inBatches(tasks,size=12){
 for(let i=0;i<tasks.length;i+=size){
  await Promise.all(tasks.slice(i,i+size).map(fn=>fn().catch(e=>errors.push(e.message))));
 }
}
await inBatches(allConcepts.flatMap(c=>lanes.map(lane=>()=>checkQuiz(c,lane))));
await inBatches(allConcepts.map(c=>()=>checkVideos(c)));
if(writes){
 const sessionId=randomUUID();
 for(const lane of lanes){
  const conceptId="circuits";
  const answers=quizFor(conceptId,lane).map(q=>q.answer);
  const first=await request("/api/learning-quiz",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId,conceptId,lane,answers})});
  if(!first.passed||first.score!==3||first.best?.score!==3||first.best?.attempts<1)
   errors.push("Server-side scoring / storage error "+lane);
  else writeCount++;
  const loaded=await request("/api/learning-quiz?"+new URLSearchParams({sessionId,conceptId,lane}));
  if(loaded.best?.score!==3)errors.push("GET failed to retrieve best quiz result "+lane);
 }
}
console.log("QUIZ GET checks",quizCount,"/",allConcepts.length*lanes.length);
console.log("VIDEO GET checks",videoCount,"/",allConcepts.length);
console.log("QUIZ POST checks",writeCount,"/",writes?lanes.length:0);
if(errors.length){console.error(errors.slice(0,30).join("\n"));process.exitCode=1}
else console.log("PASS all quiz/video endpoint contracts; external YouTube playback is not tested by this script.");
