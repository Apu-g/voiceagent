import {NextRequest,NextResponse} from "next/server";
import {getConcept} from "@/lib/curriculum";
import {makeLearningVisual} from "@/lib/visuals";
export const runtime="nodejs";
export async function GET(req:NextRequest){
 const id=req.nextUrl.searchParams.get("conceptId")||"";
 const concept=getConcept(id);
 if(!concept)return NextResponse.json({error:"Unknown topic"},{status:404});
 return NextResponse.json(makeLearningVisual(concept.id,concept.title,concept.essentials));
}
