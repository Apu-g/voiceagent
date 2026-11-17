import {NextRequest,NextResponse} from "next/server";
import {createRoom,changeRoom,loadRoom,roomView} from "@/lib/study-rooms";
export const runtime="nodejs";
const limits=new Map<string,{expires:number,count:number}>();
const respondError=(e:unknown)=>NextResponse.json({error:e instanceof Error?e.message:"Room unavailable"},{status:400});
export async function GET(req:NextRequest){
 const code=(req.nextUrl.searchParams.get("code")||"").toUpperCase();
 const token=req.headers.get("x-room-token")||"";
 try{
  if(!/^[0-9a-f]{48}$/.test(token))throw Error("Room credential is missing");
  const room=await loadRoom(code);if(!room)throw Error("Room does not exist or has expired");
  return NextResponse.json({room:roomView(room,token)});
 }catch(e){return respondError(e)}
}
export async function POST(req:NextRequest){
 const ip=(req.headers.get("x-forwarded-for")||"local").split(",")[0],now=Date.now();
 const bucket=limits.get(ip)||{expires:now+60000,count:0};
 if(bucket.expires<now){bucket.expires=now+60000;bucket.count=0}
 bucket.count++;limits.set(ip,bucket);
 if(bucket.count>45)return NextResponse.json({error:"Too many room requests"},{status:429});
 try{
  const body=await req.json() as {action?:string;code?:string;token?:string;name?:string;conceptId?:string;option?:number;focus?:string};
  if(typeof body.action!=="string")throw Error("Choose an action");
  if(body.action==="create")return NextResponse.json(await createRoom(String(body.conceptId||""),String(body.name||"")));
  if(!["join","begin","answer","next","leave","focus"].includes(body.action))throw Error("Unsupported action");
  return NextResponse.json(await changeRoom(String(body.code||"").toUpperCase(),body.action as "join"|"begin"|"answer"|"next"|"leave"|"focus",{token:body.token,name:body.name,option:body.option,focus:body.focus}));
 }catch(e){return respondError(e)}
}
