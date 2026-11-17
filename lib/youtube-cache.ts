import {readFileSync,statSync} from "node:fs";
import {join} from "node:path";
import {safeVideo,type FoundVideo} from "./youtube-search";

type CacheFile={version:number;entries:Record<string,{fetchedAt:string;videos:unknown[]}>};
let cachedFile:CacheFile|null=null;
let cachedMtime=-1;
export function prefetchedVideos(conceptId:string):FoundVideo[]|null{
 const file=join(process.cwd(),"data","youtube-video-cache.json");
 try{
  const mtime=statSync(file).mtimeMs;
  if(!cachedFile||cachedMtime!==mtime){
   const raw=JSON.parse(readFileSync(file,"utf8")) as CacheFile;
   if(raw.version!==1||!raw.entries||typeof raw.entries!=="object")return null;
   cachedFile=raw;cachedMtime=mtime;
  }
  const data=cachedFile.entries[conceptId];
  if(!data||!Array.isArray(data.videos)||!data.videos.length)return null;
  const seen=new Set<string>();
  const relevant=(v:FoundVideo)=>conceptId==="orbit-motion"?/\b(orbit|orbital|gravity|gravitational|moon fall|satellite)\b/i.test(v.title):conceptId==="moon-tides"?/\b(tides?|tidal)\b/i.test(v.title):true;
  return data.videos.map(safeVideo).filter((v):v is FoundVideo=>v!==null)
   .filter(v=>{if(!relevant(v)||seen.has(v.id))return false;seen.add(v.id);return true}).slice(0,4);
 }catch{return null}
}
