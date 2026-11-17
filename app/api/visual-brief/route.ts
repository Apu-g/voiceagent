import {NextRequest,NextResponse} from "next/server";
import {getConcept} from "@/lib/curriculum";
import {explorerFor,type LearningLane} from "@/lib/learning-lanes";
import {buildLaneVisualBrief} from "@/lib/lane-visual-brief";
export async function GET(req:NextRequest){
 const id=req.nextUrl.searchParams.get("conceptId")||"",lane=req.nextUrl.searchParams.get("lane")||"";
 if(!getConcept(id)||!["logic","course","future"].includes(lane))return NextResponse.json({error:"Invalid topic"},{status:400});
 const concept=getConcept(id)!;
 const objective=(req.nextUrl.searchParams.get("objective")||"").slice(0,140);
 const allowed=concept.essentials.includes(objective)?objective:concept.essentials[0]||concept.title;
 return NextResponse.json(buildLaneVisualBrief(concept,lane as LearningLane,allowed,explorerFor(id)));
}