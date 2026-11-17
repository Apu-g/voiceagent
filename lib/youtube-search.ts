import {spawn} from "node:child_process";
import {existsSync} from "node:fs";
import {join} from "node:path";

export type FoundVideo={id:string;title:string;channel:string;description:string;embedUrl:string;watchUrl:string;durationSeconds?:number|null};
const youtubeId=/^[a-zA-Z0-9_-]{11}$/;
export function safeVideo(raw:unknown):FoundVideo|null{
 if(!raw||typeof raw!=="object")return null;
 const entry=raw as Record<string,unknown>;
 if(typeof entry.id!=="string"||!youtubeId.test(entry.id))return null;
 const id=entry.id;
 const title=typeof entry.title==="string"?entry.title.slice(0,130):"YouTube lesson";
 const channel=typeof entry.channel==="string"?entry.channel.slice(0,90):"YouTube creator";
 const description=typeof entry.description==="string"?entry.description.slice(0,240):"";
 const durationSeconds=typeof entry.durationSeconds==="number"&&entry.durationSeconds>0&&Number.isFinite(entry.durationSeconds)?entry.durationSeconds:null;
 return {id,title,channel,description,durationSeconds,
  embedUrl:"https://www.youtube.com/embed/"+id+"?rel=0",
  watchUrl:"https://www.youtube.com/watch?v="+id};
}
export async function searchWithYtDlp(query:string,limit=4):Promise<FoundVideo[]>{
 const project=process.cwd();
 const python=process.env.YTDLP_PYTHON||(
  existsSync(join(project,".venv","bin","python"))?join(project,".venv","bin","python"):"python3"
 );
 const script=join(project,"scripts","yt_niche_search.py");
 return new Promise((resolve,reject)=>{
  const child=spawn(python,[script,"--query",query.slice(0,180),"--limit",String(Math.min(Math.max(limit,1),6))],{
   cwd:project,shell:false,windowsHide:true,env:process.env,stdio:["ignore","pipe","pipe"]
  });
  let output="",error="",settled=false;
  const timer=setTimeout(()=>child.kill("SIGKILL"),12000);
  child.stdout.on("data",(b:Buffer)=>{output+=b.toString("utf8");if(output.length>150000)child.kill("SIGKILL")});
  child.stderr.on("data",(b:Buffer)=>{error=(error+b.toString("utf8")).slice(-1200)});
  child.once("error",e=>{if(settled)return;settled=true;clearTimeout(timer);reject(e)});
  child.once("close",code=>{
   if(settled)return;settled=true;clearTimeout(timer);
   if(code!==0){reject(new Error("Video extraction failed"+(error?": "+error.slice(-200):"")));return}
   try{
    const response=JSON.parse(output) as {videos?:unknown[]};
    const seen=new Set<string>();
    const videos=(response.videos||[]).map(safeVideo).filter((x):x is FoundVideo=>!!x).filter(v=>{
     if(seen.has(v.id))return false;seen.add(v.id);return true;
    });
    resolve(videos.slice(0,Math.max(1,limit)));
   }catch{reject(new Error("Video extractor returned invalid JSON"))}
  });
 });
}
