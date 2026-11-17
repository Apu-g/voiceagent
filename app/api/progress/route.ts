import {NextRequest,NextResponse} from "next/server";
import {getDB} from "@/lib/mongodb";
export const runtime="nodejs";
export async function GET(req:NextRequest){
 const sessionId=req.nextUrl.searchParams.get("sessionId");
 if(!sessionId||!/^[-a-zA-Z0-9_]{12,80}$/.test(sessionId))return NextResponse.json({turns:[]});
 try{const db=await getDB();const turns=db?await db.collection("turns").find({sessionId}).sort({createdAt:-1}).limit(20).project({_id:0,studentText:1,exoText:1,conceptId:1,createdAt:1,decision:1}).toArray():[];return NextResponse.json({turns});}
 catch{return NextResponse.json({turns:[],storage:"unavailable"});}
}
