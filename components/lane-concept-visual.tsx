"use client";
import {useMemo} from "react";
import {buildLaneVisualBrief} from "@/lib/lane-visual-brief";
import {explorerFor,type LearningLane} from "@/lib/learning-lanes";
type Concept={id:string;title:string;grade?:number;subject?:string;essentials:string[];summary:string;question:string;misconception:string;chapter:string;keywords:string[]};
export function LaneConceptVisual({concept,lane,objective}:{concept:Concept;lane:LearningLane;objective?:string}){
 const brief=useMemo(()=>buildLaneVisualBrief(concept,lane,objective||concept.essentials[0]||concept.title,explorerFor(concept.id)),[concept,lane,objective]);
 return <section className="lane-diagram" data-testid={"lane-diagram-"+lane}>
  <div className="lane-diagram-heading"><b>{brief.title}</b><span>Instant curriculum-grounded visual</span></div>
  <div className="lane-diagram-scroll"><svg viewBox="0 0 820 220" role="img" aria-label={brief.title} width="100%">
   <defs><marker id={"ld-arrow-"+lane} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="#7b8fb7"/></marker></defs>
   <rect width="820" height="220" rx="16" fill="#f7faff"/>
   {brief.nodes.map((n,i)=>{
    const x=15+i*276,detail=n.detail.length>73?n.detail.slice(0,70)+"…":n.detail;
    const words=detail.match(/.{1,34}(?:\s|$)/g)?.slice(0,3).map(w=>w.trim())||[detail];
    return <g key={n.label}><rect x={x} y="49" width="245" height="133" rx="14" fill={i===1?"#e9f4ee":"#fff"} stroke={i===1?"#93bea7":"#ccdaef"} strokeWidth="1.5"/>
     <text x={x+13} y="77" fontSize="12" fontWeight="700" fill="#466996">{n.label}</text>
     {words.map((w,j)=><text key={j} x={x+13} y={101+j*19} fontSize="13" fill="#3b527a">{w}</text>)}
     {i<2&&<path d={`M${x+245} 112 L${x+271} 112`} stroke="#7b8fb7" strokeWidth="2" markerEnd={`url(#ld-arrow-${lane})`}/>}</g>;
   })}
   <text x="410" y="205" textAnchor="middle" fill="#8293ae" fontSize="11">A concept map for learning, not an AI-generated scientific photograph</text>
  </svg></div>
 </section>;
}
