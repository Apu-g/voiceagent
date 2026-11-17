"use client";
import {useEffect,useMemo,useState} from "react";
import {ArrowRight,BookOpen,BrainCircuit,CheckCircle2,Compass,HelpCircle,MessageCircle,Sparkles,Target,TrendingUp} from "lucide-react";
import type {DashboardSummary,TopicProgress} from "@/lib/student-dashboard";
type Evidence={objective:string;status:"correct"|"misconception"|"unverified";quote?:string;note:string};
type CurrentRoadmap={analysis:{conceptId:string;conceptTitle:string;evidence:Evidence[]};journey?:Array<{index:number;text:string;kind:string;why:string;next:string}>};
const statusLabel={"not-yet-checked":"Ready to explore","in-progress":"In progress","needs-review":"Revisit an idea","practiced":"All three paths practiced"};
const laneColors={logic:"#617dda",course:"#32a48b",future:"#a27bd3"};
const empty:DashboardSummary={topics:[],totalTopics:0,activeTopics:0,coveredTopics:0,passedQuizzes:0,reviewedPaths:0,videosReviewed:0,timeline:[],focus:null,latestReview:null};
export function StudentDashboard({sessionId,roadmap,onTalk,onRoadmap,onLesson}:{sessionId:string;roadmap:CurrentRoadmap|null;onTalk:()=>void;onRoadmap:()=>void;onLesson:(id:string)=>void}){
 const [data,setData]=useState<DashboardSummary>(empty),[loading,setLoading]=useState(true),[error,setError]=useState(""),[selected,setSelected]=useState("");
 useEffect(()=>{
  if(!sessionId)return;let active=true;
  queueMicrotask(()=>{if(active)setLoading(true)});
  fetch("/api/student-dashboard?sessionId="+encodeURIComponent(sessionId),{cache:"no-store"})
   .then(r=>{if(!r.ok)throw Error("Learning history unavailable");return r.json()})
   .then(v=>{if(active){setData(v);setLoading(false);setError("")}})
   .catch(()=>{if(active){setLoading(false);setError("We couldn't load saved progress. Your conversation is still available.")}});
  return()=>{active=false};
 },[sessionId]);
 const localEvidence=roadmap?.analysis;
 const topicList=useMemo(()=>{
  const list=data.topics.slice();
  if(localEvidence&&!list.some(t=>t.conceptId===localEvidence.conceptId)){
   list.unshift({conceptId:localEvidence.conceptId,title:localEvidence.conceptTitle,chapter:"Current learning conversation",lastActivity:"",observed:localEvidence.evidence.filter(e=>e.status==="correct").length,misconceptions:localEvidence.evidence.filter(e=>e.status==="misconception").length,unverified:localEvidence.evidence.filter(e=>e.status==="unverified").length,reviews:1,questions:0,lanes:["logic","course","future"].map((id)=>({id:id as "logic"|"course"|"future",name:id==="logic"?"Crack the Logic":id==="course"?"Ace Your Course":"Beyond the Classroom",reviewed:false,passed:false,score:null,total:null,attempts:0})),reviewedLanes:0,passedQuizzes:0,videosReviewed:0,status:"in-progress",nextStep:"Explain one concept, then try the pathway quiz."} satisfies TopicProgress);
  }
  return list;
 },[data.topics,localEvidence]);
 const active=topicList.find(t=>t.conceptId===selected)||topicList.find(t=>t.conceptId===localEvidence?.conceptId)||topicList[0];
 const supported=(roadmap&&active&&roadmap.analysis.conceptId===active.conceptId?roadmap.analysis.evidence:[]).filter(e=>e.status==="correct");
 const unclear=(roadmap&&active&&roadmap.analysis.conceptId===active.conceptId?roadmap.analysis.evidence:[]).filter(e=>e.status==="misconception");
 const pending=(roadmap&&active&&roadmap.analysis.conceptId===active.conceptId?roadmap.analysis.evidence:[]).filter(e=>e.status==="unverified");
 const recent=roadmap?.journey?.filter(t=>t.kind==="supported"||t.kind==="question"||t.kind==="misconception").slice(-4)||[];
 const recentTrend=data.timeline.filter(t=>t.conceptId===active?.conceptId).slice(-9);
 const max=Math.max(3,...recentTrend.map(t=>t.observed+t.misconceptions));
 const x=(i:number)=>44+i*580/Math.max(1,recentTrend.length-1),y=(n:number)=>157-112*n/max;
 const path=recentTrend.map((t,i)=>x(i)+","+y(t.observed)).join(" ");
 return <div className="student-dashboard" data-testid="student-dashboard">
  <div className="sd-hero">
   <div><div className="eyebrow">YOUR LEARNING JOURNEY</div><h1>Your ideas are becoming <em>understanding.</em></h1>
    <p>EXO connects what you said, what you practiced, and what you still want to know. See progress backed by learning evidence—not an invented intelligence score.</p>
    <div className="sd-hero-actions"><button onClick={onTalk}><MessageCircle size={16}/> Talk with EXO</button><button onClick={onRoadmap}><Compass size={16}/> My learning path <ArrowRight size={15}/></button></div>
   </div><div className="sd-hero-emblem"><BrainCircuit size={62}/><span>Learn • Reflect • Grow</span></div>
  </div>
  {error&&<div className="sd-error" role="alert">{error}</div>}
  <div className="sd-metrics">
   <div><BookOpen size={21}/><b>{topicList.length}</b><span>Topics discovered</span><small>Questions start a learning journey</small></div>
   <div><Target size={21}/><b>{data.reviewedPaths}</b><span>Pathways explored</span><small>Self-reported learning activity</small></div>
   <div><CheckCircle2 size={21}/><b>{data.passedQuizzes}</b><span>Pathway quizzes passed</span><small>Saved best quiz results</small></div>
   <div><Sparkles size={21}/><b>{data.coveredTopics}</b><span>Topics practiced in all 3 paths</span><small>Not a mastery certification</small></div>
  </div>
  <div className="sd-two-cols">
   <section className="sd-panel sd-focus" data-testid="dashboard-topic-progress">
    <div className="sd-heading"><div><small>YOUR LEARNING MAP</small><h2>Where you are now</h2></div><span>{loading?"Loading…":topicList.length+" topic(s)"}</span></div>
    {topicList.length?<><div className="sd-topics">{topicList.map(t=><button key={t.conceptId} className={t.conceptId===active?.conceptId?"selected":""} onClick={()=>setSelected(t.conceptId)}><span>{t.title}<small>{statusLabel[t.status]}</small></span><ArrowRight size={14}/></button>)}</div>
    {active&&<div className="sd-active-topic"><div className="sd-active-title"><h3>{active.title}</h3><span>{active.passedQuizzes}/3 quizzes passed</span></div><p>{active.chapter}</p>
     <div className="sd-pathways">{active.lanes.map(l=><div key={l.id}><div className="sd-lane-top"><b>{l.name}</b><span>{l.passed?"Quiz passed":l.reviewed?"Explored":"To explore"}</span></div><div className="sd-progress-track"><div style={{width:(l.passed&&l.reviewed?100:l.passed||l.reviewed?50:0)+"%",background:laneColors[l.id]}}/></div></div>)}</div>
     <div className="sd-next"><Target size={18}/><div><strong>Recommended next move</strong><p>{active.nextStep}</p></div></div>
     <button className="sd-continue" onClick={()=>onLesson(active.conceptId)}>Continue this topic <ArrowRight size={15}/></button>
    </div>}</>:<div className="sd-empty"><HelpCircle size={29}/><b>Your learning map begins with one question.</b><p>Talk with EXO about anything you want to understand. Then select “Let&apos;s learn” to build your first roadmap.</p><button onClick={onTalk}>Start a conversation</button></div>}
   </section>
   <section className="sd-panel sd-evidence">
    <div className="sd-heading"><div><small>REAL EVIDENCE</small><h2>What EXO has observed</h2></div><BrainCircuit size={19}/></div>
    <div className="sd-evidence-stats"><div><strong>{supported.length||active?.observed||0}</strong><span>Ideas supported</span></div><div><strong>{unclear.length||active?.misconceptions||0}</strong><span>Possible mix-ups</span></div><div><strong>{pending.length||active?.unverified||0}</strong><span>Not checked yet</span></div></div>
    {supported.length>0&&<div className="sd-observation correct"><b>What you explained</b>{supported.slice(0,2).map(e=><p key={e.objective}><strong>{e.objective}</strong>{e.quote&&<span>“{e.quote.slice(0,180)}”</span>}</p>)}</div>}
    {unclear.length>0&&<div className="sd-observation review"><b>Let&apos;s revisit</b>{unclear.slice(0,2).map(e=><p key={e.objective}>{e.objective}{e.quote&&<span>“{e.quote.slice(0,180)}”</span>}</p>)}</div>}
    {!supported.length&&!unclear.length&&<div className="sd-observation neutral"><b>Keep exploring</b><p>EXO hasn&apos;t confirmed enough claims from this topic to say what you understand yet. Questions are not mistakes.</p></div>}
    <div className="sd-note"><HelpCircle size={16}/> A concept is only marked supported when a related explanation was detected. Unmentioned concepts remain unknown, not wrong.</div>
   </section>
  </div>
  <div className="sd-two-cols">
   <section className="sd-panel" data-testid="dashboard-learning-trend">
    <div className="sd-heading"><div><small>YOUR LEARNING CURVE</small><h2>How understanding develops</h2></div><TrendingUp size={19}/></div>
    <p className="sd-help">Each point shows the number of concepts supported in a review of the <b>same topic</b>. It is not a percentage or a comparison between different subjects.</p>
    {recentTrend.length>=2?<div className="sd-chart"><svg viewBox="0 0 670 195" width="100%" role="img" aria-label="Supported concepts by review over time">
     <rect x="0" y="0" width="670" height="195" rx="15" fill="#f7f9ff"/>
     {[0,1,2].map(i=><g key={i}><line x1="39" x2="638" y1={y(max*i/2)} y2={y(max*i/2)} stroke="#dbe5f4" strokeDasharray="4 5"/><text x="9" y={y(max*i/2)+4} fontSize="12" fill="#8ca0bd">{Math.round(max*i/2)}</text></g>)}
     <polyline points={path} fill="none" stroke="#5d76d9" strokeWidth="3" strokeLinecap="round"/>
     {recentTrend.map((t,i)=><g key={t.date+i}><circle cx={x(i)} cy={y(t.observed)} r="5.5" fill="#546ed4" stroke="white" strokeWidth="2"/><text x={x(i)} y="182" textAnchor="middle" fontSize="11" fill="#8295b6">{i+1}</text></g>)}
    </svg></div>:<div className="sd-empty-chart"><TrendingUp size={24}/><p>Your trend appears after two reviews of the same topic. Review your understanding again after practice to see what&apos;s changed.</p></div>}
    <div className="sd-chart-caption"><span><i/> Supported concepts per review</span><span>{recentTrend.length} review(s) of this topic</span></div>
   </section>
   <section className="sd-panel" data-testid="dashboard-learning-story">
    <div className="sd-heading"><div><small>YOUR LEARNING STORY</small><h2>What changed during the chat</h2></div><MessageCircle size={19}/></div>
    {recent.length?recent.map(step=><div className={"sd-story-step "+step.kind} key={step.index}><span>Turn {step.index} · {step.kind==="question"?"Question":step.kind==="supported"?"Evidence":"Review"}</span><blockquote>“{step.text.slice(0,160)}”</blockquote><p>{step.why}</p></div>):<div className="sd-empty-chart"><MessageCircle size={24}/><p>After your first “Let&apos;s learn” review, EXO will connect your actual words to possible strengths, questions and next steps.</p></div>}
    <button className="sd-story-more" onClick={onRoadmap}>View the full conversation analysis <ArrowRight size={14}/></button>
   </section>
  </div>
  <p className="sd-disclaimer">Your progress combines conversation evidence, quizzes, reviewed learning paths and videos. Watching a video or ticking a box does not by itself prove mastery. Stored prototype history may reset if MongoDB is not connected.</p>
 </div>;
}
