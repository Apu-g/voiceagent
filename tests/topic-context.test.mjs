import test from "node:test";
import assert from "node:assert/strict";
import {resolveConversationFocus,isStudyQuestion} from "../lib/conversation-focus.ts";
import {chooseContext,quickMentorReply,buildMessages,localReply} from "../lib/tutor.ts";
import {analyzeAnswers,createRoadmap} from "../lib/learning-engine.ts";
import {getConcept} from "../lib/curriculum.ts";
import {summarizeSnapshot} from "../lib/learning-history.ts";

const talk=[
 "something about space",
 "you what I want to know is how does waves affect",
 "how are tidal waves a",
 "I want to know how tidal waves affected by munch Gravity",
 "classes to each other",
 "latest",
 "tomato",
 "passion to each other Why is it not happening",
 "why can't moon full Earth towards itself because of the gravity and only pulls the Tides from the ocean"
];
test("Lunar gravity question overrides the sidebar reflection chapter",()=>{
 const focus=resolveConversationFocus("light",talk);
 assert.equal(focus.conceptId,"moon-tides");
 assert.equal(focus.confidence,"high");
 const input={message:talk.at(-1),conceptId:"light",history:talk.slice(0,-1).map(text=>({role:"student",text}))};
 const context=chooseContext(input);
 assert.equal(context[0].id,"moon-tides");
 assert.ok(context.every(c=>!["light","chemical-reactions","acids-bases"].includes(c.id)));
 const reply=quickMentorReply(input.message,context[0]);
 assert.match(reply,/whole Earth/i);
 assert.match(reply,/solid rock|ground/i);
 assert.doesNotMatch(reply,/reflection|mirror/i);
 assert.match(localReply(input,context),/entire Earth/i);
 const system=buildMessages(input,context)[0].content;
 assert.match(system,/latest student question overrides/i);
});
test("Student questions are curiosity, not evidence of mastering lunar tides",()=>{
 const focus=resolveConversationFocus("light",talk);
 const analysis=analyzeAnswers(focus.conceptId,focus.relevantTurns);
 assert.equal(analysis.studentTurns,0);
 assert.ok(analysis.evidence.every(e=>e.status==="unverified"));
 assert.equal(analysis.confidence,"low");
 const path=createRoadmap(analysis);
 assert.deepEqual(path.lessons.map(x=>x.conceptId),["moon-tides","gravity-basics","orbit-motion"]);
 assert.ok(path.lessons.every(l=>l.chapter.includes("Earth and Space")));
 assert.equal(path.lessons.some(l=>l.conceptId==="chemical-reactions"),false);
});
test("Students demonstrating lunar science produce provisional, quoted evidence",()=>{
 const explanation="The Moon pulls on Earth and ocean water. Its gravity is stronger on the near side than the far side.";
 const a=analyzeAnswers("moon-tides",[explanation]);
 assert.equal(a.evidence[0].status,"correct");
 assert.equal(a.evidence[1].status,"correct");
 assert.equal(a.evidence[2].status,"unverified");
 assert.equal(a.studentTurns,1);
 const snapshot=summarizeSnapshot("a-session-that-is-long",createRoadmap(a),1);
 assert.equal(snapshot.correct,2);
 assert.equal(snapshot.unverified,1);
 assert.equal(snapshot.questions,1);
});
test("Questions, fragments and topic hopping are not confident knowledge",()=>{
 assert.equal(isStudyQuestion("I want to know how tidal waves affected by munch Gravity"),true);
 assert.equal(isStudyQuestion("why can't moon full Earth towards itself"),true);
 assert.equal(isStudyQuestion("The moon pulls Earth"),false);
 const a=resolveConversationFocus("light",["What's reflection?","latest","tomato"]);
 assert.equal(a.conceptId,"light");
 assert.ok(getConcept("moon-tides"));
});

test("An older Moon conversation cannot hijack a new series-and-parallel-circuits question",()=>{
 const turns=[
  "why can't moon pull the Earth and only the tides?",
  "How do tidal bulges work?",
  "I would like to understand electrical circuits instead",
  "Why is the current the same in series but the voltage the same in parallel?"
 ];
 const topic=resolveConversationFocus("circuits",turns);
 assert.equal(topic.conceptId,"circuits");
 assert.equal(topic.confidence,"high");
 assert.ok(topic.relevantTurns.every(t=>!/moon|tides|tidal/i.test(t)));
 const analysis=analyzeAnswers(topic.conceptId,topic.relevantTurns);
 assert.equal(analysis.studentTurns,0);
 const lessons=createRoadmap(analysis).lessons;
 assert.deepEqual(lessons.map(l=>l.conceptId),["circuits","electricity"]);
 assert.ok(lessons.every(l=>l.chapter==="Electricity"));
});
test("Series/parallel explanations produce relevant evidence, not lunar claims",()=>{
 const statements=["In series the same current passes through every resistor.","In parallel all branches have the same voltage."];
 const focus=resolveConversationFocus("circuits",statements);
 assert.equal(focus.conceptId,"circuits");
 const evidence=analyzeAnswers(focus.conceptId,focus.relevantTurns).evidence;
 assert.equal(evidence[0].status,"correct");
 assert.equal(evidence[1].status,"correct");
 assert.equal(evidence[2].status,"unverified");
});
test("With no clear new topic, retain the selected circuits lesson",()=>{
 const focus=resolveConversationFocus("circuits",["I am confused about something","Could you explain this again?"]);
 assert.equal(focus.conceptId,"circuits");
 assert.equal(focus.confidence,"low");
 assert.equal(analyzeAnswers(focus.conceptId,focus.relevantTurns).studentTurns,0);
});
