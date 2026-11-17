#!/usr/bin/env node
// Run: npm run visuals:export -- --ids moon-tides,photosynthesis
// Outputs contextual SVG image files plus JSON briefs; no paid image API calls.
import {mkdirSync,writeFileSync} from "node:fs";
import {join} from "node:path";
import {allConcepts} from "../lib/curriculum.ts";
import {explorerFor} from "../lib/learning-lanes.ts";
import {buildLaneVisualBrief} from "../lib/lane-visual-brief.ts";
const arg=process.argv.indexOf("--ids"),all=process.argv.includes("--all");
const ids=all?allConcepts.map(c=>c.id):arg>=0?(process.argv[arg+1]||"").split(","):["moon-tides","photosynthesis","electricity"];
const out=join(process.cwd(),"public","generated-learning");mkdirSync(out,{recursive:true});
const escape=(text)=>String(text).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
function svgFor(brief){
 const colors={logic:"#4376b5",course:"#4a8e72",future:"#9c719c"},shade=colors[brief.lane];
 const blocks=brief.nodes.map((n,i)=>{
  const x=26+i*310;const lines=(n.detail.match(/.{1,29}(?:\s|$)/g)||[n.detail]).slice(0,4);
  return `<rect x="${x}" y="94" rx="18" width="280" height="198" fill="#fff" stroke="${shade}" stroke-opacity=".4" stroke-width="2"/><text x="${x+17}" y="125" fill="${shade}" font-size="16" font-weight="700">${escape(n.label)}</text>${lines.map((line,j)=>`<text x="${x+17}" y="${158+j*27}" fill="#33476e" font-size="15">${escape(line.trim())}</text>`).join("")}${i<2?`<path d="M${x+280} 180 H${x+308}" fill="none" stroke="${shade}" stroke-width="3"/>`: ""}`;
 }).join("");
 return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="340" viewBox="0 0 960 340" role="img" aria-label="${escape(brief.title)}"><rect width="960" height="340" rx="22" fill="#f2f6ff"/><text x="30" y="50" font-family="Arial,sans-serif" font-size="25" font-weight="700" fill="#2c4e80">${escape(brief.title.slice(0,60))}</text><g font-family="Arial,sans-serif">${blocks}</g><text x="28" y="320" font-family="Arial,sans-serif" font-size="13" fill="#7b8db0">EXO original curriculum-grounded visual · Verify scientific details before classroom use</text></svg>`;
}
let count=0;
for(const id of ids){
 const concept=allConcepts.find(c=>c.id===id);if(!concept){process.stdout.write("Unknown topic: "+id+"\n");continue}
 for(const lane of ["logic","course","future"]){
  const brief=buildLaneVisualBrief(concept,lane,concept.essentials[0]||concept.title,explorerFor(id));
  const base=id+"-"+lane;
  writeFileSync(join(out,base+".svg"),svgFor(brief));
  writeFileSync(join(out,base+".json"),JSON.stringify(brief,null,2));
  count++;
 }
}
process.stdout.write("Exported "+count+" SVG diagrams and visual briefs to public/generated-learning.\n");
