import {NextResponse} from "next/server";
import {configuredProviders} from "@/lib/providers";
import {getDB} from "@/lib/mongodb";
export const runtime="nodejs";
export async function GET(){
 let mongodb:"connected"|"not configured"|"unavailable"="not configured";
 if(process.env.MONGODB_URI){try{const db=await getDB();await db?.command({ping:1});mongodb="connected";}catch{mongodb="unavailable";}}
 return NextResponse.json({status:"ok",providers:configuredProviders(),mongodb,stt:"browser",curriculum:"original Grade 10 Science concept notes"});
}
