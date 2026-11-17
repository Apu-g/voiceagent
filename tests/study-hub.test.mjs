import test from "node:test";
import assert from "node:assert/strict";
import {getQuiz} from "../lib/group-quiz.ts";
import {explorerFor,makeLaneOverview} from "../lib/learning-lanes.ts";
import {getConcept} from "../lib/curriculum.ts";
import {createRoom,changeRoom,loadRoom,roomView} from "../lib/study-rooms.ts";
test("Three learning lanes use curriculum context with real-world mission",()=>{
 const c=getConcept("maths-10-preview-4");assert.ok(c);
 const lanes=makeLaneOverview(c);
 assert.match(lanes.logic.description,/idea/i);
 assert.match(lanes.course.description,/NCERT/i);
 assert.match(lanes.future.mission.title,/basketball/i);
 assert.ok(lanes.future.mission.fields.length>=2);
 assert.ok(explorerFor("photosynthesis").fact.includes("carbon dioxide"));
});
test("Review-checked quiz has unique questions and valid answer indices",()=>{
 for(const [id,questions] of [["photosynthesis",getQuiz("photosynthesis")],["maths-10-preview-4",getQuiz("maths-10-preview-4")]]){
  assert.equal(questions.length,3,id);
  assert.equal(new Set(questions.map(q=>q.id)).size,3);
  assert.ok(questions.every(q=>q.options.length===4&&q.correct>=0&&q.correct<4&&q.explanation));
 }
});
test("Private room supports creation, join, answer scoring, and final standings",async()=>{
 const created=await createRoom("photosynthesis","Learner 1");
 assert.ok(created.room.code.length===8);
 const joined=await changeRoom(created.room.code,"join",{name:"Learner 2"});
 assert.equal(joined.room.players.length,2);
 const focused=await changeRoom(created.room.code,"focus",{token:created.token,focus:"future"});
 assert.equal(focused.room.focus,"future");
 await assert.rejects(()=>changeRoom(created.room.code,"focus",{token:joined.token,focus:"course"}),/Only the host/);
 assert.equal(roomView((await loadRoom(created.room.code)),created.token).isHost,true);
 const rawRoom=await loadRoom(created.room.code);
 assert.ok(rawRoom);
 assert.throws(()=>roomView(rawRoom,"f".repeat(48)),/Not a member/);
 await assert.rejects(()=>changeRoom(created.room.code,"begin",{token:joined.token}),/host/);
 const begun=await changeRoom(created.room.code,"begin",{token:created.token});
 assert.equal(begun.room.phase,"quiz");assert.equal(begun.room.question.correct,undefined);
 const a1=await changeRoom(created.room.code,"answer",{token:created.token,option:1});
 assert.equal(a1.room.players.find(p=>p.id===a1.room.playerId).score,100);
 await assert.rejects(()=>changeRoom(created.room.code,"answer",{token:created.token,option:1}),/already/);
 const a2=await changeRoom(created.room.code,"answer",{token:joined.token,option:0});
 assert.equal(a2.room.phase,"review");
 assert.equal(a2.room.question.correct,1);
 const next=await changeRoom(created.room.code,"next",{token:created.token});
 assert.equal(next.room.phase,"quiz");assert.equal(next.room.questionIndex,1);
 for(const idx of [0,1])await changeRoom(created.room.code,"answer",{token:idx===0?created.token:joined.token,option:0});
 await changeRoom(created.room.code,"next",{token:created.token});
 for(const idx of [0,1])await changeRoom(created.room.code,"answer",{token:idx===0?created.token:joined.token,option:1});
 const last=await changeRoom(created.room.code,"next",{token:created.token});
 assert.equal(last.room.phase,"finished");
 assert.equal(last.room.players.length,2);
});
