import {NextRequest,NextResponse} from "next/server";
import {getConcept} from "@/lib/curriculum";
import {searchWithYtDlp,safeVideo,type FoundVideo} from "@/lib/youtube-search";
import {prefetchedVideos} from "@/lib/youtube-cache";
export const runtime="nodejs";
const memory=new Map<string,{expires:number;videos:FoundVideo[];provider:string}>();
const inflight=new Map<string,Promise<{videos:FoundVideo[];provider:string}>>();
const topicWords=(value:string)=>[...new Set((value.toLowerCase().match(/[a-z]{4,}/g)||[]).filter(w=>!["that","with","from","this","does","into","class","learning","earth"].includes(w)))];
function rankByLearningNeed(videos:FoundVideo[],focus:string):FoundVideo[]{
 if(!focus)return videos;
 const words=topicWords(focus);
 return videos.map((v,i)=>({v,i,score:words.reduce((n,w)=>n+(v.title.toLowerCase().includes(w)?2:0)+(v.description.toLowerCase().includes(w)?0.3:0),0)}))
 .sort((a,b)=>b.score-a.score||a.i-b.i).map(({v})=>v);
}
async function youtubeApi(query:string,key:string){
 const params=new URLSearchParams({
  part:"snippet",type:"video",maxResults:"5",q:query,safeSearch:"strict",
  videoEmbeddable:"true",videoSyndicated:"true",relevanceLanguage:"en",videoDuration:"medium",key
 });
 const res=await fetch("https://www.googleapis.com/youtube/v3/search?"+params.toString(),{signal:AbortSignal.timeout(4500),cache:"no-store"});
 if(!res.ok)throw Error("API unavailable");
 const data=await res.json() as {items?:Array<{id?:{videoId?:string};snippet?:{title?:string;channelTitle?:string;description?:string}}>};
 return (data.items||[]).map(v=>safeVideo({id:v.id?.videoId,title:v.snippet?.title,channel:v.snippet?.channelTitle,description:v.snippet?.description})).filter((v):v is FoundVideo=>!!v).slice(0,4);
}
async function resolveVideos(query:string):Promise<{videos:FoundVideo[];provider:string}>{
 const preference=process.env.VIDEO_SEARCH_PROVIDER||"ytdlp";
 const key=process.env.YOUTUBE_API_KEY;
 if(preference==="youtube-api"&&key){
  try{return {videos:await youtubeApi(query,key),provider:"youtube-api"}}catch{/* try yt-dlp below */}
 }
 try{
  const videos=await searchWithYtDlp(query,4);
  if(videos.length)return {videos,provider:"yt-dlp"};
 }catch(error){console.warn("[videos] yt-dlp search failed:",error instanceof Error?error.message:"unknown");/* fallback to API */}
 if(key){
  try{return {videos:await youtubeApi(query,key),provider:"youtube-api"}}catch{/* no result */}
 }
 return {videos:[],provider:"unavailable"};
}
export async function GET(req:NextRequest){
 const id=(req.nextUrl.searchParams.get("conceptId")||"").slice(0,90);
 const concept=getConcept(id);
 if(!concept)return NextResponse.json({error:"Unknown concept"},{status:400});
 const query=concept.chapter.startsWith("Beyond the Classroom")
  ?concept.title+" Moon Earth gravity tides student science explanation"
  :"NCERT Class "+(concept.grade??10)+" "+(concept.subject||"Science")+" "+concept.title+" explanation lesson";
 const candidateFocus=(req.nextUrl.searchParams.get("focus")||"").slice(0,120);
 const focus=concept.essentials.includes(candidateFocus)||concept.id==="moon-tides"&&/^(The Moon attracts all of Earth|Tides come from differences in gravity across Earth|Earth and Moon orbit a common centre of mass)$/.test(candidateFocus)?candidateFocus:"";
 const searchUrl="https://www.youtube.com/results?"+new URLSearchParams({search_query:query});
 const prefetched=prefetchedVideos(id);
 if(prefetched?.length)return NextResponse.json({videos:rankByLearningNeed(prefetched,focus),status:"ready",provider:"prefetched-yt-dlp",searchUrl,cached:true,reviewNote:"Videos are automatically discovered, not teacher-vetted."});
 const cached=memory.get(id);
 if(cached&&cached.expires>Date.now())return NextResponse.json({videos:rankByLearningNeed(cached.videos,focus),status:cached.videos.length?"ready":"unavailable",provider:cached.provider,searchUrl,cached:true,reviewNote:"Search results are not teacher-vetted."});
 let work=inflight.get(id);
 if(!work){work=resolveVideos(query).finally(()=>inflight.delete(id));inflight.set(id,work)}
 const result=await work;
 if(memory.size>200)memory.clear();
 memory.set(id,{...result,expires:Date.now()+(result.videos.length?1000*60*60*3:1000*60*3)});
 return NextResponse.json({videos:rankByLearningNeed(result.videos,focus),status:result.videos.length?"ready":"unavailable",provider:result.provider,searchUrl,reviewNote:"Automatically discovered videos are not teacher-reviewed. Check suitability before classroom use."});
}
