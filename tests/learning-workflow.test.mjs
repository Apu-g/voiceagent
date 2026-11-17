import test from "node:test";import assert from "node:assert/strict";
import {allConcepts,getConcept} from "../lib/curriculum.ts";
import {quizFor,publicQuiz,gradeQuiz} from "../lib/learning-quizzes.ts";
import {buildLaneVisualBrief} from "../lib/lane-visual-brief.ts";
import {explorerFor} from "../lib/learning-lanes.ts";
import {explainConversationJourney} from "../lib/conversation-journey.ts";
import {reserveSpeech,speechLanguage} from "../lib/speech-budget.ts";
import {earnedAchievement,saveQuizResult,cachedQuizResult,getQuizResults} from "../lib/quiz-progress.ts";
test("Three pathways exist and server validates answers for every curriculum topic",()=>{
 for(const c of allConcepts)for(const lane of ["logic","course","future"]){
  const questions=quizFor(c.id,lane);
  const served=publicQuiz(c.id,lane);
  assert.equal(questions.length,3, c.id+" "+lane);
  assert.equal(served.length,3);
  assert.ok(served.every(q=>!("answer" in q)&&!("explanation" in q)&&!("objective" in q)),c.id);
  assert.ok(questions.every(q=>q.options.length===3&&new Set(q.options).size===3),c.id+" "+lane);
  assert.ok(questions.every(q=>q.options[q.answer]),c.id);
  const win=gradeQuiz(c.id,lane,questions.map(q=>q.answer));
  assert.equal(win.passed,true);assert.equal(win.score,3);assert.equal(win.points,300);
  const fail=gradeQuiz(c.id,lane,questions.map(q=>(q.answer+1)%3));
  assert.equal(fail.passed,false);assert.equal(fail.score,0);
 }
});
test("Quiz validates invalid and tampered submissions",()=>{
 assert.throws(()=>gradeQuiz("moon-tides","logic",[1]),/Invalid/);
 assert.throws(()=>gradeQuiz("moon-tides","logic",[0,0,55]),/Invalid/);
 assert.throws(()=>quizFor("missing-lesson","logic"),/Unknown/);
 const chosen=quizFor("moon-tides","logic","The Moon attracts all of Earth");
 assert.equal(chosen[0].objective,"The Moon attracts all of Earth");
});
test("Original three-lane images are based on approved facts and context",()=>{
 const c=getConcept("moon-tides"),mission=explorerFor(c.id);
 for(const lane of ["logic","course","future"]){
  const brief=buildLaneVisualBrief(c,lane,c.essentials[0],mission);
  assert.equal(brief.nodes.length,3);assert.equal(brief.lane,lane);
  assert.match(brief.scenePrompt,/accurate labels/i);
  assert.doesNotMatch(brief.scenePrompt,/senku|dr stone|anime character/i);
 }
});
test("Conversation graph distinguishes questions, drift and evidence",()=>{
 const turns=["what does the Moon do?","The Moon pulls on Earth and oceans.","tomato","Why do tides happen?"];
 const journey=explainConversationJourney("moon-tides",turns);
 assert.equal(journey.length,4);
 assert.equal(journey[0].kind,"question");
 assert.equal(journey[1].kind,"supported");
 assert.equal(journey[2].kind,"off-topic");
 assert.equal(journey[3].kind,"question");
});
test("Topic covered achievements require all three passed quizzes and all three explored pathways",()=>{
 const sessionId="test-session-00",conceptId="moon-tides";
 const results=["logic","course","future"].map(lane=>({sessionId,conceptId,lane,score:3,total:3,passed:true,points:300,attempts:1,updatedAt:"2026-11-17"}));
 assert.equal(earnedAchievement(results,[]).covered,0);
 const progress=[{conceptId,lanes:{logic:true,course:true,future:true}}];
 const summary=earnedAchievement(results,progress);
 assert.equal(summary.covered,1);assert.equal(summary.badges[0].id,"topic-covered-moon-tides");assert.equal(summary.points,900);
});
test("Sarvam speech quotas and language validation reject excessive usage without requests",()=>{
 assert.equal(speechLanguage("kn-IN"),"kn-IN");assert.equal(speechLanguage("xx-YY"),"en-IN");
 const session="quota-test-session-english";
 assert.equal(reserveSpeech(session,"tts",500),true);
 assert.equal(reserveSpeech(session,"tts",501),false);
 assert.equal(reserveSpeech(session,"tts",500),true);
 assert.equal(reserveSpeech(session,"tts",500),true);
 assert.equal(reserveSpeech(session,"tts",500),false);
 assert.equal(reserveSpeech("bad","stt"),false);
});

test("offline quiz scores remain readable immediately after submission and best score is retained",async()=>{
 const sessionId="offline-test-session-ui123",conceptId="circuits",lane="logic";
 const first=await saveQuizResult({sessionId,conceptId,lane,score:3,total:3,passed:true,points:300});
 assert.equal(first.record.score,3);assert.equal(first.record.attempts,1);
 const replay=await saveQuizResult({sessionId,conceptId,lane,score:1,total:3,passed:false,points:100});
 assert.equal(replay.record.score,3);assert.equal(replay.record.passed,true);assert.equal(replay.record.attempts,2);
 const immediate=cachedQuizResult(sessionId,conceptId,lane);
 assert.equal(immediate?.score,3);
 assert.equal((await getQuizResults(sessionId,conceptId))[0].score,3);
});
