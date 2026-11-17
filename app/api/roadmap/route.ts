import { NextRequest, NextResponse, after } from "next/server";
import { analyzeAnswers, createRoadmap, validateAIReview, type EvidenceStatus } from "@/lib/learning-engine";
import { getConcept } from "@/lib/curriculum";
import {resolveConversationFocus} from "@/lib/conversation-focus";
import {explainConversationJourney} from "@/lib/conversation-journey";
import {recordLearningSnapshot} from "@/lib/learning-history";
import { reviewWithAI } from "@/lib/review-provider";
import { getDB } from "@/lib/mongodb";
export const runtime="nodejs";
export const maxDuration=30;
const buckets=new Map<string,{n:number;until:number}>();
export async function POST(req:NextRequest){
 const startedAt=Date.now();
 try{
  const ip=(req.headers.get("x-forwarded-for")||"local").split(",")[0].trim();
  const body=await req.json();
  const token=typeof body.sessionId==="string"&&/^[a-z0-9_-]{12,80}$/i.test(body.sessionId)?body.sessionId:ip;
  const now=Date.now();
  // Quotas are per learner rather than per shared school IP. Keep a separate
  // higher IP ceiling to prevent mass session rotation from bypassing limits.
  for(const [key,limit] of [["learner:"+token,12],["ip:"+ip,120]] as const){
   const previous=buckets.get(key);
   const current=!previous||previous.until<now?{n:0,until:now+60000}:previous;
   current.n++;buckets.set(key,current);
   if(current.n>limit)return NextResponse.json({error:"Too many roadmap analyses for this session. Please retry shortly."},{status:429});
  }
  if(buckets.size>6000)for(const [key,value] of buckets)if(value.until<now)buckets.delete(key);
  const conceptId=typeof body.conceptId==="string"?body.conceptId:"";
  if(!getConcept(conceptId))return NextResponse.json({error:"Choose a valid Science topic."},{status:400});
  if(!Array.isArray(body.turns)||body.turns.length>30||body.turns.some((x:unknown)=>typeof x!=="string"||x.length>2000))return NextResponse.json({error:"Invalid conversation transcript."},{status:400});
  const turns=(body.turns as string[]).slice(-24);
  const focus=resolveConversationFocus(conceptId,turns);
  const relevant=focus.relevantTurns;
  let analysis=analyzeAnswers(focus.conceptId,relevant);
  // Curiosity/questions are a learning intent, not demonstrated competency.
  if(focus.conceptId!==conceptId)
   analysis={...analysis,rationale:"Your questions moved toward "+analysis.conceptTitle+". Explore it without treating your curiosity as a test score. "+analysis.rationale};
  let reviewProvider="rules-only";
  if(analysis.needsReview&&turns.some(x=>x.trim().split(/\s+/).length>=9)){
   try{
    const result=await reviewWithAI(getConcept(focus.conceptId)!,relevant,analysis.evidence.filter(x=>x.status==="unverified").map(x=>x.objective));
    analysis=validateAIReview(analysis,result.evidence as {objective:string;status:EvidenceStatus;quote:string}[],relevant);
    reviewProvider=result.provider;
   }catch{reviewProvider="rules-only (AI unavailable)";}
  }
  const roadmap=createRoadmap(analysis);
  const sessionId=typeof body.sessionId==="string"&&/^[a-z0-9_-]{12,80}$/i.test(body.sessionId)?body.sessionId:"";
  if(sessionId){recordLearningSnapshot(sessionId,roadmap,focus.questions.length).catch(()=>{});after(async()=>{try{
   const db=await getDB();
   await db?.collection("roadmaps").updateOne({sessionId,conceptId:analysis.conceptId},{$set:{sessionId,conceptId:analysis.conceptId,roadmap,reviewProvider,updatedAt:new Date()}},{upsert:true});
  }catch{/* Best-effort persistence. */}});}
  return NextResponse.json({...roadmap,journey:explainConversationJourney(focus.conceptId,turns),topicDetection:focus,reviewProvider,analysisTimeMs:Date.now()-startedAt});
 }catch{return NextResponse.json({error:"Could not build a roadmap."},{status:500});}
}
