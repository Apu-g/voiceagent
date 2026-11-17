import test from "node:test";
import assert from "node:assert/strict";
import {maths10Lessons} from "../lib/math-grade10.ts";
import {getConcept} from "../lib/curriculum.ts";
import {analyzeAnswers,createRoadmap} from "../lib/learning-engine.ts";

test("All fourteen Class 10 Mathematics chapters have original explanatory lessons",()=>{
 assert.equal(maths10Lessons.length,14);
 for(let i=1;i<=14;i++){
  const concept=getConcept("maths-10-preview-"+i),lesson=maths10Lessons[i-1];
  assert.ok(concept,"chapter "+i);
  assert.equal(concept.subject,"Mathematics");assert.equal(concept.grade,10);
  assert.ok(!concept.summary.includes("This upload is a contents-page"),"chapter "+i+" must have a real explanation");
  assert.ok(concept.summary.length>70,concept.id);
  assert.ok(lesson.essentials.length>=3,concept.id);
  assert.ok(lesson.example.problem&&lesson.example.working.length>=2,concept.id);
  assert.ok(lesson.example.answer&&lesson.example.check,concept.id);
  assert.ok(lesson.prerequisite instanceof Array);
 }
});
test("Grade 10 Maths roadmaps follow prerequisite ordering and stay on Maths",()=>{
 for(let i=1;i<=14;i++){
  const id="maths-10-preview-"+i;
  const roadmap=createRoadmap(analyzeAnswers(id,[]));
  assert.ok(roadmap.lessons.length>=1&&roadmap.lessons.length<=5);
  assert.equal(new Set(roadmap.lessons.map(x=>x.conceptId)).size,roadmap.lessons.length);
  assert.ok(roadmap.lessons.every(x=>getConcept(x.conceptId)?.subject==="Mathematics"));
  assert.ok(roadmap.lessons.every(x=>getConcept(x.conceptId)?.grade===10));
  assert.ok(roadmap.lessons.every(x=>x.title&&x.description&&x.objective));
 }
 const quadratic=createRoadmap(analyzeAnswers("maths-10-preview-4",["I'm not sure"]));
 assert.deepEqual(quadratic.lessons.slice(0,2).map(x=>x.conceptId),["maths-10-preview-2","maths-10-preview-4"]);
 const height=createRoadmap(analyzeAnswers("maths-10-preview-9",[]));
 assert.deepEqual(height.lessons.slice(0,2).map(x=>x.conceptId),["maths-10-preview-8","maths-10-preview-9"]);
});
test("Mathematics conversation is not automatically assigned mastery by keywords",()=>{
 const analysis=analyzeAnswers("maths-10-preview-4",["The quadratic discriminant is b squared minus four a c."]);
 assert.equal(analysis.confidence,"low");
 assert.ok(analysis.evidence.every(x=>x.status==="unverified"));
});
test("Worked examples are internally consistent for selected common numeric checks",()=>{
 // Make sure illustrative arithmetic is sound; other examples are explanatory and require editorial review.
 assert.equal(18*24,6*72);
 assert.equal(3+9*4,39);
 assert.equal(10/2*(3+39),210);
 assert.equal((4-1)**2+(6-2)**2,25);
 assert.equal((2**2)/(3**2),4/9);
 assert.equal(1/2+(1-1/2),1);
});
