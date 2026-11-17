"use client";
import type {JourneyStep} from "@/lib/conversation-journey";
export function ConversationJourney({steps}:{steps:JourneyStep[]}){
 const visible=steps.slice(-14),W=760,H=185;
 const color={question:"#6d8bbc",supported:"#369b69",misconception:"#c98650","off-topic":"#b68fb1",unverified:"#a0adc5"};
 const x=(i:number)=>38+i*(W-80)/Math.max(1,visible.length-1),y=(n:number)=>142-n*48;
 const points=visible.map((s,i)=>x(i)+","+y(s.signal)).join(" ");
 return <section className="journey-card conversation-journey" data-testid="conversation-journey">
  <div className="section-title"><div><span className="tiny-label">HOW THE CONVERSATION DEVELOPED</span><h2>Question → idea → next step</h2></div><span className="soft-pill">{steps.length} student turns</span></div>
  <p className="dashboard-explainer">Each dot represents one student turn. It shows observed conversational relevance, not an intelligence score. Silence and transcription errors are not misconceptions.</p>
  {visible.length?<div className="journey-graph-scroll"><svg viewBox={"0 0 "+W+" "+H} role="img" aria-label="Learning conversation timeline of questions, evidence and topic shifts" width="100%">
   <rect width={W} height={H} rx="14" fill="#f8faff"/>
   {[0,1,2].map(n=><g key={n}><line x1="35" y1={y(n)} x2={W-29} y2={y(n)} stroke="#dce6f5" strokeDasharray="4 5"/><text x="8" y={y(n)+4} fontSize="11" fill="#8da0bd">{n===2?"+" :n===1?"?" : "·"}</text></g>)}
   <polyline points={points} fill="none" stroke="#8ea3c7" strokeWidth="2.5"/>
   {visible.map((s,i)=><g key={s.index}><circle cx={x(i)} cy={y(s.signal)} r="7" fill={color[s.kind]} stroke="#fff" strokeWidth="2"/><text x={x(i)} y={H-14} textAnchor="middle" fontSize="11" fill="#7284a7">{s.index}</text></g>)}
  </svg></div>:<p>No conversation evidence yet.</p>}
  <div className="journey-legend"><span>Green: claim observed</span><span>Blue: question</span><span>Orange: check possible misconception</span><span>Purple: topic shift</span></div>
  <div className="journey-evidence-boxes">
   {visible.map(s=><div key={s.index} className={"journey-evidence-step "+s.kind} data-testid={"journey-turn-"+s.index}>
    <div><b>Turn {s.index}</b><small>{s.kind==="supported"?"Idea observed":s.kind==="misconception"?"Check this":s.kind==="question"?"Asked a question":s.kind==="off-topic"?"Topic switch or unclear":"Not verified"}</small></div>
    <blockquote>“{s.text.slice(0,190)}{s.text.length>190?"…":""}”</blockquote>
    <p>{s.why}</p><p><strong>Next:</strong> {s.next}</p>
   </div>)}
  </div>
 </section>;
}
