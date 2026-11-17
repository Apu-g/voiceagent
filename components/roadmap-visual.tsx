"use client";
import {useMemo} from "react";
import {explorerFor} from "@/lib/learning-lanes";
type Evidence={objective:string;status:"correct"|"misconception"|"unverified";note:string;quote?:string};
export function RoadmapVisual({conceptId,title,evidence}:{conceptId:string;title:string;evidence:Evidence[]}){
 const nodes=useMemo(()=>evidence.slice(0,4),[evidence]),mission=explorerFor(conceptId);
 const colors={correct:{fill:"#e9f8ef",stroke:"#80bc91",text:"#30754e",tag:"Explained"},misconception:{fill:"#fff3e3",stroke:"#e4b070",text:"#955c27",tag:"Revisit"},unverified:{fill:"#f1f4fb",stroke:"#ced7ed",text:"#667897",tag:"Explore"}};
 return <section className="journey-card personalized-visual" data-testid="personalized-visual">
  <div className="section-title"><div><span className="tiny-label">YOUR LEARNING PICTOGRAPH</span><h2>What you said → what to discover</h2></div><span className="soft-pill">Personalized concept map</span></div>
  <p>This diagram highlights evidence from your explanation. Not mentioned is not the same as incorrect.</p>
  <div className="visual-roadmap-scroller">
   <svg viewBox="0 0 750 270" role="img" aria-label={"Concept map for "+title} width="100%" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="750" height="270" rx="14" fill="#f8faff"/>
    <text x="375" y="29" textAnchor="middle" fontSize="18" fontWeight="700" fill="#304a80">{title.slice(0,48)}</text>
    {nodes.map((node,i)=>{
     const style=colors[node.status],x=34+(i%2)*368,y=52+Math.floor(i/2)*100;
     const words=node.objective.length>40?[node.objective.slice(0,38)+"…"]: [node.objective];
     return <g key={i}>
      <rect x={x} y={y} width="318" height="81" rx="12" fill={style.fill} stroke={style.stroke} strokeWidth="1.5"/>
      <text x={x+15} y={y+30} fill={style.text} fontSize="15" fontWeight="700">{words[0]}</text>
      <text x={x+15} y={y+57} fill={style.text} fontSize="11">{style.tag} · {node.status==="correct"?"Evidence found":node.status==="misconception"?"Check this idea":"Not checked yet"}</text>
     </g>;
    })}
    {!nodes.length&&<text x="375" y="120" textAnchor="middle" fontSize="15" fill="#65779a">Speak with EXO to create your personal concept map.</text>}
    <text x="375" y="258" textAnchor="middle" fontSize="11" fill="#7b8baa">Based on observable statements, not a grade or career verdict</text>
   </svg>
  </div>
  <div className="realworld-strip"><b>Now connect it with real life:</b> {mission.scenario}</div>
 </section>;
}
