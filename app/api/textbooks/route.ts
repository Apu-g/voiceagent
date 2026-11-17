import {NextRequest,NextResponse} from "next/server";
import {bookStatus,retrieveTextbook} from "@/lib/textbook";
export const runtime="nodejs";
export async function GET(req:NextRequest){
 const query=(req.nextUrl.searchParams.get("q")||"").slice(0,180);
 const grade=req.nextUrl.searchParams.get("grade")==="9"?9:10;
 const subject=req.nextUrl.searchParams.get("subject")==="Mathematics"?"Mathematics":"Science";
 const chapter=(req.nextUrl.searchParams.get("chapter")||"").slice(0,100);
 const status=bookStatus();
 if(!query)return NextResponse.json(status);
 const results=retrieveTextbook({query,grade,subject,chapter,limit:5});
 return NextResponse.json({...status,results,query,grade,subject});
}
