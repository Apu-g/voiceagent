import {NextResponse} from "next/server";
import {chapters,allConcepts,sourceUrl,books} from "@/lib/curriculum";
export const runtime="nodejs";
export async function GET(){return NextResponse.json({chapters,concepts:allConcepts,books,sourceUrl});}
