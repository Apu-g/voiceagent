"use client";
import {useEffect,useState} from "react";
import {Activity,CheckCircle2,HelpCircle,BookOpen,AlertCircle} from "lucide-react";
type Snapshot={conceptId:string;conceptTitle:string;createdAt:string;correct:number;misconceptions:number;unverified:number;questions:number;reviewedClaims:number;confidence:string};
type Topic={conceptId:string;conceptTitle:string;correct:number;misconceptions:number;unverified:number;questions:number;reviewedClaims:number};
type Current={conceptId:string;conceptTitle:string;evidence:Array<{status:string}>;studentTurns:number};
export function LearningCurveDashboard({sessionId,current}:{sessionId:string;current:Current}){
 const [snapshots,setSnapshots]=useState<Snapshot[]>([]);
 const [topics,setTopics]=useState<Topic[]>([]);
 const [explored,setExplored]=useState(0);
 const [storage,setStorage]=useState("");
 useEffect(()=>{
  if(!sessionId)return;let active=true;
  fetch("/api/learning-curve?sessionId="+encodeURIComponent(sessionId),{cache:"no-store"}).then(r=>r.json()).then(data=>{
   if(!active)return;
   setSnapshots((data.snapshots||[]).slice(-16));setTopics(data.topics||[]);
   setExplored((data.explored||[]).reduce((acc:number,v:{lanes:Record<string,boolean>})=>acc+Object.values(v.lanes||{}).filter(Boolean).length,0));
   setStorage(data.storage||"");
  }).catch(()=>{});
  return()=>{active=false};
 },[sessionId,current.conceptId,current.studentTurns]);
 const shown=snapshots.filter(s=>s.conceptId===current.conceptId);
 const latest=shown.at(-1);
 const focused=topics.find(t=>t.conceptId===current.conceptId);
 const known=focused?.correct??current.evidence.filter(e=>e.status==="correct").length;
 const misconception=focused?.misconceptions??current.evidence.filter(e=>e.status==="misconception").length;
 const unchecked=focused?.unverified??current.evidence.filter(e=>e.status==="unverified").length;
 const max=Math.max(3,...shown.map(s=>s.correct+s.misconceptions));
 const width=640,height=175;
 const x=(i:number)=>34+i*(width-68)/Math.max(1,shown.length-1);
 const y=(n:number)=>height-38-(height-64)*(n/max);
 const line=shown.map((s,i)=>x(i)+","+y(s.correct)).join(" ");
 return <section className="journey-card progress-dashboard" data-testid="learning-curve">
  <div className="section-title"><div><span className="tiny-label">STUDENT LEARNING JOURNEY</span><h2><Activity size={19}/> Evidence over time</h2></div><span className="soft-pill">{topics.length||1} topic{topics.length===1?"":"s"} explored</span></div>
  <p className="dashboard-explainer">This shows what EXO could observe from your explanations, not a percentage of how intelligent you are. Questions and uncertainty are valuable starting points.</p>
  <div className="progress-metrics">
   <div><CheckCircle2 size={16}/><b>{known}</b><span>Relevant claims observed</span></div>
   <div><AlertCircle size={16}/><b>{misconception}</b><span>Possible mix-ups</span></div>
   <div><HelpCircle size={16}/><b>{unchecked}</b><span>Ideas to check</span></div>
   <div><BookOpen size={16}/><b>{explored}</b><span>Paths explored</span></div>
  </div>
  <h3>Evidence across reviews of {current.conceptTitle}</h3>
  {shown.length>1?<div className="learning-chart-scroll"><svg viewBox={"0 0 "+width+" "+height} role="img" aria-label="Learning timeline showing observed correct claims per review" width="100%">
   <rect x="0" y="0" width={width} height={height} rx="12" fill="#f8faff"/>
   {[0,1,2,3].map(i=><g key={i}><line x1="34" y1={y(max*i/3)} x2={width-23} y2={y(max*i/3)} stroke="#e1e8f6" strokeDasharray="3 5"/><text x="12" y={y(max*i/3)+4} fill="#94a1b9" fontSize="10">{Math.round(max*i/3)}</text></g>)}
   <polyline points={line} fill="none" stroke="#6b7fe2" strokeWidth="3" strokeLinejoin="round"/>
   {shown.map((s,i)=><g key={i}><circle cx={x(i)} cy={y(s.correct)} r="5" fill="#506acd" stroke="white" strokeWidth="2"/><text x={x(i)} y={height-13} textAnchor="middle" fontSize="10" fill="#8191ad">{i+1}</text></g>)}
  </svg></div>:<p className="dashboard-empty">Your evidence timeline starts here. Explain this topic in your own words, then revisit it to see what has changed. Different topics are not compared on the same score line.</p>}
  <div className="dashboard-legend"><span><i/> Observed relevant claims per review</span><span>{latest?.questions??0} recent questions or requests to learn</span></div>
  {topics.length>0&&<div className="dashboard-topics">{topics.slice(-5).map(t=><div key={t.conceptId}><b>{t.conceptTitle}</b><span>{t.correct} supported · {t.misconceptions} to revisit · {t.unverified} unverified</span></div>)}</div>}
  {storage==="temporary-server-memory"&&<p className="dashboard-footnote">Temporary prototype history: these measurements may reset after a server restart.</p>}
  <p className="dashboard-footnote">Not mentioned ≠ not understood. A question ≠ a misconception. This dashboard is not an assessment of mastery.</p>
 </section>;
}
