// Run: npm run videos:prefetch -- --ids photosynthesis,electricity,life-nutrition
// Or: npm run videos:prefetch -- --all
// Searches with yt-dlp in a host process, then writes a validated metadata-only cache
// for fast Next.js API responses. Does not download YouTube video files.
import {readFileSync,writeFileSync,renameSync,existsSync} from "node:fs";
import {join} from "node:path";
import {allConcepts} from "../lib/curriculum.ts";
import {searchWithYtDlp} from "../lib/youtube-search.ts";

const args=process.argv.slice(2);
const idsArg=args.indexOf("--ids");
const all=args.includes("--all");
const fallbackIds=["photosynthesis","life-nutrition","electricity","refraction","maths-10-preview-4","maths-10-preview-8"];
const ids=all?allConcepts.map(c=>c.id):idsArg>=0?String(args[idsArg+1]||"").split(",").filter(Boolean):fallbackIds;
const path=join(process.cwd(),"data","youtube-video-cache.json");
let cache={version:1,entries:{}};
if(existsSync(path)){
 try{const old=JSON.parse(readFileSync(path,"utf8"));if(old.version===1&&old.entries)cache=old}catch{}
}
for(const id of ids){
 const c=allConcepts.find(x=>x.id===id);
 if(!c){console.log("SKIP unknown topic",id);continue}
 const query="NCERT Class "+(c.grade??10)+" "+(c.subject||"Science")+" "+c.title+" explanation lesson";
 try{
  const videos=await searchWithYtDlp(query,4);
  if(videos.length){
   cache.entries[id]={fetchedAt:new Date().toISOString(),videos};
   console.log("OK",id,videos.length,"video(s)");
  }else console.log("EMPTY",id);
 }catch(e){console.log("FAILED",id,e instanceof Error?e.message:"unavailable")}
 // Save incrementally so a partial run still yields a useful fast cache.
 const temp=path+".tmp";writeFileSync(temp,JSON.stringify(cache,null,2));renameSync(temp,path);
}
console.log("Wrote",Object.keys(cache.entries).length,"topic records to data/youtube-video-cache.json");
