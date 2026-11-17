import {NextRequest,NextResponse} from "next/server";
import {getConcept} from "@/lib/curriculum";
import {maths10Lessons} from "@/lib/math-grade10";
import {retrieveTextbook} from "@/lib/textbook";
export const runtime="nodejs";
export async function GET(req:NextRequest){
 const id=req.nextUrl.searchParams.get("conceptId")||"";
 const concept=getConcept(id);
 if(!concept)return NextResponse.json({error:"Lesson not found"},{status:404});
 const grade=concept.grade??10,subject=concept.subject??"Science";
 const isEnrichment=concept.chapter.startsWith("Beyond the Classroom");
 const isMath10=id.startsWith("maths-10-preview-");
 const chapterNum=isMath10?Number(id.slice("maths-10-preview-".length)):0;
 const mathNotes=isMath10?maths10Lessons[chapterNum-1]:undefined;
 const citations=isEnrichment||isMath10&&concept.previewOnly?[]:retrieveTextbook({query:concept.title+" "+concept.keywords.slice(0,2).join(" "),grade,subject,chapter:concept.chapter,limit:3});
 const summary=isMath10?concept.summary:
  concept.id.startsWith("science-9-")||concept.id.startsWith("maths-9-")?(citations[0]?.excerpt.slice(0,550)||concept.summary):concept.summary;
 const resource=isMath10&&chapterNum>=1&&chapterNum<=14?
  {title:"NCERT official Mathematics Class 10 — Chapter "+chapterNum,
   url:"https://ncert.nic.in/textbook/pdf/jemh1"+String(chapterNum).padStart(2,"0")+".pdf",
   note:"Official external chapter PDF; not a file ingested into Explaino."}:null;
 const sourceStatus=isEnrichment?"curated-enrichment":isMath10&&!concept.previewOnly&&citations.length?"textbook-grounded":isMath10?"original-notes-official-reference":citations.length?"textbook-grounded":"curated-notes";
 return NextResponse.json({
  concept:{...concept,summary},
  citations,sourceStatus,resource,
  workedExample:mathNotes?.example??null,
  prerequisites:mathNotes?.prerequisite??[],
  warning:isEnrichment?"Beyond the Classroom is an optional science exploration, not a CBSE Class 10 NCERT textbook chapter. The notes are original explanations, not textbook quotations.":isMath10&&concept.previewOnly?"The uploaded Grade 10 Maths file contains only the preliminary pages and contents, not full chapters. This original lesson links to the official NCERT chapter PDF.":undefined,
  steps:[
   {type:"understand",title:"The big idea",text:summary},
   {type:"remember",title:"Key ideas",items:concept.essentials},
   ...(mathNotes?[{type:"worked-example",title:"Worked example",text:mathNotes.example.problem,items:mathNotes.example.working}]:[]),
   {type:"correct",title:"A common misconception",text:concept.misconception},
   {type:"try",title:"Explain it back",text:concept.question}
  ]
 });
}
