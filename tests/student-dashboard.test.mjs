import test from "node:test";
import assert from "node:assert/strict";
import {createDashboardSummary} from "../lib/student-dashboard.ts";
import {lessonMemory,lessonRows} from "../lib/progress-memory.ts";
test("Dashboard starts empty without inventing a grade or mastery",()=>{
 const data=createDashboardSummary([],[],[]);
 assert.equal(data.totalTopics,0);assert.equal(data.focus,null);assert.equal(data.coveredTopics,0);assert.deepEqual(data.timeline,[]);
});
test("Dashboard uses latest evidence and honest pathway progress",()=>{
 const sessionId="test-dashboard-session";
 const snapshots=[
  {sessionId,conceptId:"moon-tides",conceptTitle:"Why the Moon causes tides",createdAt:"2026-11-16T09:00:00Z",reviewedClaims:1,correct:0,misconceptions:1,unverified:2,questions:3,confidence:"low"},
  {sessionId,conceptId:"moon-tides",conceptTitle:"Why the Moon causes tides",createdAt:"2026-11-17T09:00:00Z",reviewedClaims:2,correct:2,misconceptions:0,unverified:1,questions:1,confidence:"medium"},
  {sessionId,conceptId:"photosynthesis",conceptTitle:"Photosynthesis",createdAt:"2026-11-15T09:00:00Z",reviewedClaims:2,correct:1,misconceptions:0,unverified:3,questions:1,confidence:"low"}
 ];
 const quiz=["logic","course"].map(lane=>({sessionId,conceptId:"moon-tides",lane,score:3,total:3,passed:true,points:300,attempts:2,updatedAt:"2026-11-17T10:00:00Z"}));
 const review=[{sessionId,conceptId:"moon-tides",lanes:{logic:true,course:true,future:false},videoReviews:["gDjeEWpyoRA"],updatedAt:"2026-11-17T11:00:00Z"}];
 const result=createDashboardSummary(snapshots,quiz,review);
 assert.equal(result.totalTopics,2);assert.equal(result.coveredTopics,0);assert.equal(result.passedQuizzes,2);assert.equal(result.reviewedPaths,2);assert.equal(result.videosReviewed,1);
 assert.equal(result.focus?.title,"Why the Moon causes tides");assert.equal(result.focus?.observed,2);
 assert.equal(result.focus?.misconceptions,0);assert.equal(result.focus?.unverified,1);
 assert.equal(result.focus?.status,"in-progress");
 assert.match(result.focus?.nextStep||"",/Beyond the Classroom/);
 assert.equal(result.timeline.length,3);
 assert.equal(result.timeline[0].title,"Photosynthesis");
 assert.deepEqual(result.timeline.filter(t=>t.conceptId==="moon-tides").map(t=>t.observed),[0,2]);
 assert.equal(result.topics.find(t=>t.conceptId==="photosynthesis")?.status,"in-progress");
});
test("Dashboard coverage requires 3 quiz passes plus 3 reviewed pathways",()=>{
 const sessionId="test-dashboard-covered";const id="moon-tides";
 const quiz=["logic","course","future"].map(lane=>({sessionId,conceptId:id,lane,score:3,total:3,passed:true,points:300,attempts:1,updatedAt:"2026-11-17T10:00:00Z"}));
 const partial=createDashboardSummary([],quiz,[{sessionId,conceptId:id,lanes:{logic:true,course:false,future:true},updatedAt:"2026-11-17T12:00:00Z"}]);
 assert.equal(partial.coveredTopics,0);
 const complete=createDashboardSummary([],quiz,[{sessionId,conceptId:id,lanes:{logic:true,course:true,future:true},updatedAt:"2026-11-17T12:00:00Z"}]);
 assert.equal(complete.coveredTopics,1);assert.equal(complete.focus?.status,"practiced");
 assert.match(complete.focus?.nextStep||"",/fresh example/);
});
test("Shared prototype progress can be read by the dashboard and lesson endpoints",()=>{
 const sessionId="test-shared-progress-1";
 const key=sessionId+"|moon-tides";
 lessonMemory().set(key,{sessionId,conceptId:"moon-tides",lanes:{logic:true},videoReviews:["gDjeEWpyoRA"],updatedAt:"2026-11-17T10:00:00Z"});
 assert.equal(lessonRows(sessionId)[0].videoReviews?.length,1);
 const summary=createDashboardSummary([],[],lessonRows(sessionId));
 assert.equal(summary.reviewedPaths,1);assert.equal(summary.videosReviewed,1);
 lessonMemory().delete(key);
});
